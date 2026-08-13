import ytdl from "@distube/ytdl-core";

// Server-side audio proxy.
//
// Playback runs through this same-origin endpoint so the equalizer/effects
// (Web Audio) can process the audio: a cross-origin YouTube iframe can't be
// routed through an AudioContext, but a same-origin <audio> element can.
//
// URLs are extracted with `@distube/ytdl-core` (pure JS — no native binary),
// which works in serverless/Vercel Runtimes where `yt-dlp` is unavailable.
// Multiple player clients are tried so PO-token-gated videos still resolve.
// Extracted googlevideo URLs are IP-signed and expire, so cache entries carry
// the URL's own expiry (minus a margin), and if a cached URL's upstream fetch
// ever fails it's evicted and re-extracted on the spot instead of handing the
// client a dead 206.

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

// Preferred player clients. The first that yields a usable format wins. Order
// matters: WEB_EMBEDDED is most permissive for the embedded audio, then the
// mobile/standalone clients which often bypass the PO-token gate.
const PLAYER_CLIENTS = ["WEB_EMBEDDED", "IOS", "ANDROID", "TV"];

// Pick the best audio-only m4a; fall back to any audio-only, then to a
// combined format as a last resort (rare — combined is heavier to proxy).
function pickFormat(info) {
  const formats = info.formats || [];
  const audioOnly = ytdl.filterFormats(formats, "audioonly");
  if (audioOnly.length) {
    const m4a = audioOnly
      .filter((f) => (f.container || "").includes("mp4") || (f.mimeType || "").includes("mp4"))
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    if (m4a.length) return { format: m4a[0], mime: "audio/mp4" };
    const byBitrate = [...audioOnly].sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    return { format: byBitrate[0], mime: byBitrate[0].mimeType?.split(";")[0] || "audio/webm" };
  }
  // Combined (has audio + video) — proxied as-is; browser <audio> ignores video.
  const combined = formats
    .filter((f) => f.hasAudio && f.hasVideo)
    .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
  if (combined.length) {
    return { format: combined[0], mime: combined[0].mimeType?.split(";")[0] || "audio/mp4" };
  }
  return null;
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
  const info = await ytdl.getInfo(videoId, {
    playerClients: PLAYER_CLIENTS,
  });
  const picked = pickFormat(info);
  if (!picked || !picked.format?.url) {
    throw new Error("no playable audio format found");
  }
  return {
    url: picked.format.url,
    mime: picked.mime,
    expires: expireAt(picked.format.url),
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
