import { getYTMusic } from "@/lib/ytmusic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing artist 'id'" }, { status: 400 });
  }

  try {
    const ytmusic = await getYTMusic();
    const artist = await ytmusic.getArtist(id);

    // Format top songs for the ArtistView
    const topSongs = (artist.topSongs || []).map(item => ({
      id: item.videoId,
      title: item.name,
      artist: {
        name: artist.name,
        id: id
      },
      album: {
        id: item.album?.albumId || null,
        title: item.album?.name || "Unknown",
        cover_medium: item.thumbnails?.[item.thumbnails.length - 1]?.url || "/icon2.png"
      },
      duration: 0,
      youtubeId: item.videoId
    }));
    
    // Format top albums
    const topAlbums = (artist.topAlbums || []).map(item => ({
      id: item.albumId,
      title: item.name,
      cover_medium: item.thumbnails?.[item.thumbnails.length - 1]?.url || "/icon2.png",
      artist: { name: artist.name }
    }));

    return Response.json({
      id: artist.artistId,
      name: artist.name,
      picture_xl: artist.thumbnails?.[artist.thumbnails.length - 1]?.url || "/icon2.png",
      nb_fan: artist.subscribers,
      topSongs,
      topAlbums
    });
  } catch (error) {
    console.error("YTMusic artist error:", error);
    return Response.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
