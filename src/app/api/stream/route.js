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
// support so seeking keeps working. Extracted URLs are IP-signed and expire,
// so cache entries carry the URL's own expiry (minus a margin) capped at 2h —
// and if a cached URL's upstream fetch ever fails, it's evicted and a fresh
// URL is extracted on the spot instead of handing the client a 502.
//
// NOTE: requires the `yt-dlp` binary to be installed where the server runs.

const execFileAsync = promisify(execFile);

// videoId -> { url, mime, expires }
const streamCache = new Map();
// videoId -> Promise — dedup concurrent requests for the same video.
const inflight = new Map();

const CACHE_TTL = 2 * 60 * 60 * 1000;
// Never hand the client a URL that's within this much of its own expiry — a
// stream that dies mid-playback is worse than re-extracting a fresh one.
const EXPIRE_MARGIN = 5 * 60 * 1000;
// Cached stream URLs are IP-signed and can silently go stale. On an upstream
// failure we evict the bad entry and re-extract up to this many times before
// giving up and letting the client fall back to the YouTube iframe.
const MAX_EXTRACT_ATTEMPTS = 3;

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
// in <3s, failures in ~1-2s). web_embedded is added because a handful of
// videos are only served to the embedded player client.
const YTDLP_CLIENTS = [
  [],
  ["--extractor-args", "youtube:player_client=web_safari"],
  ["--extractor-args", "youtube:player_client=tv"],
  ["--extractor-args", "youtube:player_client=web_embedded"],
];

async function extractUrl(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let lastErr;
  for (const extraArgs of YTDLP_CLIENTS) {
    try {
      const { stdout } = await execFileAsync(
        "yt-dlp",
        [...YTDLP_BASE, ...extraArgs, watchUrl],
        { timeout: 20000, maxBuffer: 1024 * 1024 }
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

async function makeEntry(videoId) {
  const url = await extractUrl(videoId);
  return {
    url,
    // bestaudio[ext=m4a] → m4a; the fallback may be webm/opus. The upstream
    // Content-Type is passed through when present, so this is only a fallback.
    mime: "audio/mp4",
    expires: expireAt(url),
  };
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
      const reason = (err?.stderr || err?.message || String(err))
        .split("\n")
        .filter(Boolean)
        .at(-1)
        ?.slice(0, 200);
      console.error("stream: re-extract failed", videoId, reason);
      break;
    }
  }

  return Response.json({ error: "upstream unavailable" }, { status: 502 });
}
