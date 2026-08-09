import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Server-side audio proxy.
//
// Playback runs through this same-origin endpoint so the equalizer/effects
// (Web Audio) can process the audio: a cross-origin YouTube iframe can't be
// routed through an AudioContext, but a same-origin <audio> element can.
//
// YouTube's InnerTube `player` endpoint no longer returns streaming data
// without a PO token, so the direct audio URL is extracted with `yt-dlp`
// (which handles the signatures/PO-token clients), then proxied with Range
// support so seeking keeps working. URLs expire after ~7h, so the cache entry
// carries a 2h expiry instead of living forever.
//
// NOTE: requires the `yt-dlp` binary to be installed where the server runs.

const execFileAsync = promisify(execFile);

// videoId -> { url, mime, expires }
const streamCache = new Map();
// videoId -> Promise — dedup concurrent requests for the same video.
const inflight = new Map();

const CACHE_TTL = 2 * 60 * 60 * 1000;

const YTDLP_BASE = [
  "--no-playlist",
  "--no-warnings",
  "--no-update",
  "-f",
  "bestaudio[ext=m4a]/bestaudio",
  "-g",
];

// Client fallbacks: the default client can be bot-blocked on some videos
// while the same video resolves fine on another player client. Try each in
// turn before giving up (each attempt is short — a success usually returns
// in <3s, failures in ~1-2s).
const YTDLP_CLIENTS = [
  [],
  ["--extractor-args", "youtube:player_client=web_safari"],
  ["--extractor-args", "youtube:player_client=tv"],
];

async function extractUrl(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let lastErr;
  for (const extraArgs of YTDLP_CLIENTS) {
    try {
      const { stdout } = await execFileAsync(
        "yt-dlp",
        [...YTDLP_BASE, ...extraArgs, watchUrl],
        { timeout: 15000, maxBuffer: 1024 * 1024 }
      );
      const url = stdout
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .at(-1);
      if (!url || !url.startsWith("http")) {
        throw new Error("yt-dlp returned no audio URL");
      }
      return url;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function resolveStream(videoId) {
  const hit = streamCache.get(videoId);
  if (hit && hit.expires > Date.now()) return hit;

  if (inflight.has(videoId)) return inflight.get(videoId);

  const pending = (async () => {
    const url = await extractUrl(videoId);
    const entry = {
      url,
      // bestaudio[ext=m4a] → m4a; the fallback may be webm/opus. The upstream
      // Content-Type is passed through when present, so this is only a fallback.
      mime: "audio/mp4",
      expires: Date.now() + CACHE_TTL,
    };
    streamCache.set(videoId, entry);
    return entry;
  })();

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
    const reason = (err?.stderr || err?.message || String(err))
      .split("\n")
      .filter(Boolean)
      .at(-1)
      ?.slice(0, 200);
    console.error("stream: resolve failed", videoId, reason);
    return Response.json({ error: "stream unavailable", reason }, { status: 502 });
  }

  // Browsers send Range when seeking; default to a ranged request so the
  // proxy always gets a 206 it can pass through.
  const range = req.headers.get("range") || "bytes=0-";

  let upstream;
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
    return Response.json({ error: "upstream unavailable" }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    console.error("stream: upstream error", videoId, upstream.status);
    return Response.json({ error: "upstream error" }, { status: 502 });
  }

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
