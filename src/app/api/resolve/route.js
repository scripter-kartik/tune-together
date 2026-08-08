import { connectDB } from "@/lib/db";
import SongResolution from "@/lib/models/SongResolution";
import { searchYouTube } from "@/lib/ytResolver";

// Resolve a Deezer track to a full-length YouTube video.
//
// Deezer's public API only exposes 30s previews, so for full songs we look the
// track up on YouTube. To keep every client in a room playing the SAME source
// (and to avoid hammering YouTube), the mapping is cached in MongoDB keyed by
// the Deezer track id.

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
