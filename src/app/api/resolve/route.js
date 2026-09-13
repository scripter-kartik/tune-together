import { connectDB } from "@/lib/db";
import SongResolution from "@/lib/models/SongResolution";
import { searchYouTube } from "@/lib/ytResolver";

const CACHE_LOOKUP_TIMEOUT_MS = 800;

function within(ms, work) {
  return Promise.race([
    work(),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}







export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deezerId = searchParams.get("id");
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";

  if (!deezerId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  
  
  
  const cachedResolution = within(CACHE_LOOKUP_TIMEOUT_MS, async () => {
    await connectDB();
    return SongResolution.findOne({ deezerId: String(deezerId) }).lean();
  }).catch((err) => {
    console.error("resolve: cache lookup failed", err);
    return null;
  });

  const youtubeResolution = searchYouTube(`${title} ${artist}`.trim()).catch((err) => {
    console.error("resolve: youtube search failed", err);
    return null;
  });

  
  
  const first = await Promise.race([
    cachedResolution.then((value) => ({ source: "cache", value })),
    youtubeResolution.then((value) => ({ source: "youtube", value })),
  ]);

  if (first.source === "cache" && first.value?.youtubeId) {
    return Response.json({ youtubeId: first.value.youtubeId, cached: true });
  }

  const youtubeId = first.source === "youtube"
    ? first.value
    : await youtubeResolution;

  
  if (youtubeId) {
    
    
    
    void SongResolution.findOneAndUpdate(
      { deezerId: String(deezerId) },
      { deezerId: String(deezerId), youtubeId, title, artist },
      { upsert: true, new: true }
    ).catch((err) => console.error("resolve: cache write failed", err));
  }

  return Response.json({ youtubeId });
}
