import { getYTMusic } from "@/lib/ytmusic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const ytmusic = await getYTMusic();
    const results = await ytmusic.search(q);
    
    // We map results to a standardized format matching what the frontend expects
    const songs = [];
    const artists = [];
    const albums = [];

    results.forEach(item => {
      const cover = item.thumbnails?.[item.thumbnails.length - 1]?.url || "/icon2.png";
      
      if (item.type === "SONG" || item.type === "VIDEO") {
        songs.push({
          id: item.videoId,
          title: item.name,
          artist: {
            name: item.artist?.name || "Unknown",
            id: item.artist?.artistId || null
          },
          album: {
            id: item.album?.albumId || null,
            title: item.album?.name || "Unknown",
            cover_medium: cover
          },
          duration: item.duration || 0,
          youtubeId: item.videoId // Tell the frontend it already has the yt ID
        });
      } else if (item.type === "ARTIST") {
        artists.push({
          id: item.artistId,
          name: item.name,
          picture_medium: cover
        });
      } else if (item.type === "ALBUM") {
        albums.push({
          id: item.albumId,
          title: item.name,
          cover_medium: cover,
          artist: {
            name: item.artist?.name || "Unknown"
          }
        });
      }
    });

    return Response.json({
      songs,
      artists,
      albums
    });
  } catch (error) {
    console.error("YTMusic search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
