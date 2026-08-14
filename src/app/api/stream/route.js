import { NextResponse } from "next/server";
import { spawn } from "child_process";

// Server-side audio proxy using yt-dlp (pure JS version for local dev, Python
// function on Vercel). Extracts a direct audio URL from YouTube then proxies
// the stream with Range support so seeking works.
// - URLs are cached in-memory with their own upstream expiry.
// - On upstream failure the bad entry is evicted and a fresh URL is extracted.

// videoId -> { url, mime, expires }
const streamCache = new Map();
// videoId -> Promise — dedup concurrent requests for the same video.
const inflight = new Map();

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const EXPIRE_MARGIN = 5 * 60 * 1000; // 5 minutes before URL's own expiry
const MAX_EXTRACT_ATTEMPTS = 3;

// Preferred player clients. The first that yields a usable format wins.
// Order matters: WEB_EMBEDDED is most permissive for embedded audio,
// then mobile/standalone clients which often bypass the PO-token gate.
const YTDLP_CLIENTS = [
  [], // default
  ["--extractor-args", "youtube:player_client=web_embedded"],
  ["--extractor-args", "youtube:player_client=ios"],
  ["--extractor-args", "youtube:player_client=android"],
  ["--extractor-args", "youtube:player_client=tv"],
];

// googlevideo URLs carry their own `expire` timestamp in the query string.
function urlExpiry(url) {
  try {
    const ts = new URL(url).searchParams.get("expire");
    if (ts) {
      const ms = Number(ts) * 1000;
      if (Number.isFinite(ms)) return ms;
    }
  } catch {}
  return null;
}

// Cache a stream URL until its own expiry (minus a safety margin) or the fixed
// TTL, whichever comes first — never longer than the URL can actually play.
function expireAt(url) {
  const now = Date.now();
  const own = urlExpiry(url);
  if (own) return Math.min(own - EXPIRE_MARGIN, now + CACHE_TTL);
  return now + CACHE_TTL;
}

function runYtDlp(videoId, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--no-playlist",
      "--no-warnings",
      "--no-update",
      "-f", "bestaudio[ext=m4a]/bestaudio",
      "-g",
      ...extraArgs,
      watchUrl,
    ];

    const proc = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        const url = stdout.trim().split("\n").pop().trim();
        if (url && url.startsWith("http")) {
          resolve({ url, mime: "audio/mp4" });
        } else {
          reject(new Error(`yt-dlp returned no URL: ${stderr || stdout}`));
        }
      } else {
        reject(new Error(`yt-dlp exited with ${code}: ${stderr || "unknown"}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`yt-dlp spawn failed: ${err.message}`));
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error("yt-dlp timeout"));
    }, 20000);
  });
}

async function makeEntry(videoId) {
  let lastErr = null;
  for (const extra of YTDLP_CLIENTS) {
    try {
      const result = await runYtDlp(videoId, extra);
      return {
        url: result.url,
        mime: result.mime,
        expires: expireAt(result.url),
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`all yt-dlp clients failed: ${lastErr?.message || lastErr}`);
}

async function resolveStream(videoId) {
  const hit = streamCache.get(videoId);
  if (hit && hit.expires > Date.now()) return hit;

  if (inflight.has(videoId)) return inflight.get(videoId);

  const pending = makeEntry(videoId).then((entry) => {
    streamCache.set(videoId, entry);
    return entry;
  });

  inflight.set(videoId, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(videoId);
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    return new Response("videoId is required", { status: 400 });
  }

  let entry;
  try {
    entry = await resolveStream(videoId);
  } catch (err) {
    const reason = (err?.message || String(err)).split("\n").filter(Boolean).at(-1)?.slice(0, 200);
    console.error("stream: resolve failed", videoId, reason);
    return Response.json({ error: "stream unavailable", reason }, { status: 502 });
  }

  // Browsers send Range when seeking; default to a ranged request so the
  // proxy always gets a 206 it can pass through.
  const range = req.headers.get("range") || "bytes=0-";

  // Upstream stream URLs are IP-signed and can silently go stale, which would
  // otherwise take a song down for the whole cache TTL and force playback onto
  // the YouTube iframe (whose audio can't be routed through the equalizer).
  // On an upstream failure, evict the bad entry and re-extract a fresh URL.
  for (let attempt = 0; attempt < MAX_EXTRACT_ATTEMPTS; attempt++) {
    let upstream = null;
    try {
      upstream = await fetch(entry.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          Range: range,
        },
        redirect: "follow",
      });
    } catch (err) {
      console.error("stream: upstream fetch failed", videoId, err.message);
    }

    if (upstream && (upstream.ok || upstream.status === 206)) {
      const headers = new Headers();
      headers.set("Content-Type", upstream.headers.get("content-type") || entry.mime);
      headers.set("Accept-Ranges", "bytes");
      if (upstream.headers.get("content-range")) {
        headers.set("Content-Range", upstream.headers.get("content-range"));
      }
      if (upstream.headers.get("content-length")) {
        headers.set("Content-Length", upstream.headers.get("content-length"));
      }
      headers.set("Cache-Control", "no-store");

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    console.warn(
      "stream: upstream error",
      videoId,
      upstream?.status || "fetch failed",
      `(attempt ${attempt + 1}/${MAX_EXTRACT_ATTEMPTS})`
    );

    // The cached URL is bad — drop it and re-resolve (re-extracts + recaches).
    streamCache.delete(videoId);
    try {
      entry = await resolveStream(videoId);
    } catch (err) {
      const reason = (err?.message || String(err)).split("\n").filter(Boolean).at(-1)?.slice(0, 200);
      console.error("stream: re-extract failed", videoId, reason);
      break;
    }
  }

  return Response.json({ error: "upstream unavailable" }, { status: 502 });
}