import { connectDB } from "@/lib/db";
import SongResolution from "@/lib/models/SongResolution";
import { searchYouTube } from "@/lib/ytResolver";








export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deezerId = searchParams.get("id");
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";

  if (!deezerId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  
  try {
    await connectDB();
    const cached = await SongResolution.findOne({ deezerId: String(deezerId) });
    if (cached?.youtubeId) {
      return Response.json({ youtubeId: cached.youtubeId, cached: true });
    }
  } catch (err) {
    console.error("resolve: cache lookup failed", err);
  }

  
  let youtubeId = null;
  try {
    youtubeId = await searchYouTube(`${title} ${artist}`.trim());
  } catch (err) {
    console.error("resolve: youtube search failed", err);
  }

  
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
