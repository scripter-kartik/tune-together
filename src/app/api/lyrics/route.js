import { connectDB } from "@/lib/db";
import Lyrics from "@/lib/models/Lyrics";

// Fetch lyrics for a track from LRCLIB (https://lrclib.net) — a free, no-key
// lyrics database that returns both time-synced (LRC) and plain lyrics.
// Results are cached in MongoDB keyed by the Deezer track id.

const LRCLIB_HEADERS = {
  // LRCLIB asks clients to identify themselves.
  "User-Agent": "tune-together (https://github.com/scripter-kartik/tune-together)",
};

async function lrclibGet({ title, artist, album, duration }) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  if (album) params.set("album_name", album);
  if (duration) params.set("duration", String(duration));

  const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
    headers: LRCLIB_HEADERS,
  });
  if (!res.ok) return null;
  return res.json();
}

async function lrclibSearch({ title, artist }) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
    headers: LRCLIB_HEADERS,
  });
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  // Prefer the first result that actually has synced lyrics.
  return results.find((r) => r.syncedLyrics) || results[0];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deezerId = searchParams.get("id");
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  const album = searchParams.get("album") || "";
  const duration = searchParams.get("duration") || "";

  if (!deezerId || !title) {
    return Response.json({ error: "id and title are required" }, { status: 400 });
  }

  // 1. Cache hit (best-effort).
  try {
    await connectDB();
    const cached = await Lyrics.findOne({ deezerId: String(deezerId) });
    if (cached && (cached.syncedLyrics || cached.plainLyrics)) {
      return jsonCached({
        syncedLyrics: cached.syncedLyrics,
        plainLyrics: cached.plainLyrics,
        cached: true,
      });
    }
  } catch (err) {
    console.error("lyrics: cache lookup failed", err);
  }

  // 2. Cache miss — hit both LRCLIB endpoints IN PARALLEL (each can take
  // several seconds; running them together roughly halves the cold latency).
  let record = null;
  try {
    const [getRes, searchRes] = await Promise.allSettled([
      lrclibGet({ title, artist, album, duration }),
      lrclibSearch({ title, artist }),
    ]);
    const getVal = getRes.status === "fulfilled" ? getRes.value : null;
    const searchVal = searchRes.status === "fulfilled" ? searchRes.value : null;

    // Prefer whichever result actually has time-synced lyrics.
    if (getVal?.syncedLyrics) record = getVal;
    else if (searchVal?.syncedLyrics) record = searchVal;
    else record = getVal || searchVal;
  } catch (err) {
    console.error("lyrics: LRCLIB request failed", err);
  }

  const syncedLyrics = record?.syncedLyrics || null;
  const plainLyrics = record?.plainLyrics || null;

  // 3. Persist if we found anything (best-effort).
  if (syncedLyrics || plainLyrics) {
    try {
      await Lyrics.findOneAndUpdate(
        { deezerId: String(deezerId) },
        { deezerId: String(deezerId), syncedLyrics, plainLyrics, title, artist },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("lyrics: cache write failed", err);
    }
  }

  return jsonCached({ syncedLyrics, plainLyrics });
}

// JSON response with long-lived caching so the browser/CDN serves repeat
// requests for the same track instantly (lyrics never change).
function jsonCached(body) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    },
  });
}
