import { getYTMusic } from "@/lib/ytmusic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing album 'id'" }, { status: 400 });
  }

  try {
    const ytmusic = await getYTMusic();
    const album = await ytmusic.getAlbum(id);
    
    
    const songs = (album.songs || []).map(item => ({
      id: item.videoId,
      title: item.name,
      artist: {
        name: album.artist?.name || "Unknown",
        id: album.artist?.artistId || null
      },
      album: {
        id: id,
        title: album.name,
        cover_medium: album.thumbnails?.[album.thumbnails.length - 1]?.url || "/icon2.png"
      },
      duration: item.duration || 0,
      youtubeId: item.videoId
    }));

    return Response.json({
      id: album.albumId,
      title: album.name,
      cover_xl: album.thumbnails?.[album.thumbnails.length - 1]?.url || "/icon2.png",
      artist: {
        id: album.artist?.artistId,
        name: album.artist?.name || "Unknown"
      },
      nb_tracks: songs.length,
      release_date: album.year,
      songs
    });
  } catch (error) {
    console.error("YTMusic album error:", error);
    return Response.json({ error: "Failed to fetch album" }, { status: 500 });
  }
}
