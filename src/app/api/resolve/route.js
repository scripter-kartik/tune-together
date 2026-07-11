import { connectDB } from "@/lib/db";
import SongResolution from "@/lib/models/SongResolution";

// Resolve a Deezer track to a full-length YouTube video.
//
// Deezer's public API only exposes 30s previews, so for full songs we look the
// track up on YouTube. To keep every client in a room playing the SAME source
// (and to avoid hammering YouTube), the mapping is cached in MongoDB keyed by
// the Deezer track id.

const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// Scrape the first video id off a YouTube results page. No API key / quota.
async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query
  )}&hl=en&gl=US`;

  const res = await fetch(url, { headers: YT_HEADERS });
  if (!res.ok) return null;

  const html = await res.text();
  const match = html.match(/"videoId":"([\w-]{11})"/);
  return match ? match[1] : null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deezerId = searchParams.get("id");
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";

  if (!deezerId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  // 1. Cache hit (best-effort — never block playback on a DB hiccup).
  try {
    await connectDB();
    const cached = await SongResolution.findOne({ deezerId: String(deezerId) });
    if (cached?.youtubeId) {
      return Response.json({ youtubeId: cached.youtubeId, cached: true });
    }
  } catch (err) {
    console.error("resolve: cache lookup failed", err);
  }

  // 2. Cache miss — search YouTube.
  let youtubeId = null;
  try {
    youtubeId = await searchYouTube(`${title} ${artist}`.trim());
  } catch (err) {
    console.error("resolve: youtube search failed", err);
  }

  // 3. Persist the mapping for future lookups (best-effort).
  if (youtubeId) {
    try {
      await SongResolution.findOneAndUpdate(
        { deezerId: String(deezerId) },
        { deezerId: String(deezerId), youtubeId, title, artist },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("resolve: cache write failed", err);
    }
  }

  return Response.json({ youtubeId });
}
