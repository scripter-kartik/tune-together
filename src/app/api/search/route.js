import { getYTMusic } from "@/lib/ytmusic";

const lastThumb = (item) => item.thumbnails?.[item.thumbnails.length - 1]?.url || "/icon2.png";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return Response.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const ytmusic = await getYTMusic();

    
    
    
    
    const [songResults, videoResults, artistResults, albumResults] = await Promise.all([
      ytmusic.searchSongs(q).catch(() => []),
      ytmusic.searchVideos(q).catch(() => []),
      ytmusic.searchArtists(q).catch(() => []),
      ytmusic.searchAlbums(q).catch(() => []),
    ]);

    const allSongsAndVideos = [...(songResults || []), ...(videoResults || [])];

    
    
    const seenVideoIds = new Set();
    const songs = allSongsAndVideos.map(item => ({
      id: item.videoId,
      title: item.name,
      artist: {
        name: item.artist?.name || "Unknown",
        id: item.artist?.artistId || null,
      },
      album: {
        id: item.album?.albumId || null,
        title: item.album?.name || "Unknown",
        cover_small:  item.thumbnails?.[0]?.url  || lastThumb(item),
        cover_medium: item.thumbnails?.[1]?.url  || lastThumb(item),
        cover_big:    lastThumb(item),
        cover_xl:     lastThumb(item),
      },
      duration: item.duration || 0,
      youtubeId: item.videoId,
    })).filter((song) => {
      if (!song.id || seenVideoIds.has(song.id)) return false;
      seenVideoIds.add(song.id);
      return true;
    });

    const artists = (artistResults || []).map(item => ({
      id: item.artistId,
      name: item.name,
      picture_small:  item.thumbnails?.[0]?.url || lastThumb(item),
      picture_medium: item.thumbnails?.[1]?.url || lastThumb(item),
      picture_xl:     lastThumb(item),
    }));

    const albums = (albumResults || []).map(item => ({
      id: item.albumId,
      title: item.name,
      cover_small:  item.thumbnails?.[0]?.url || lastThumb(item),
      cover_medium: item.thumbnails?.[1]?.url || lastThumb(item),
      cover_big:    lastThumb(item),
      artist: {
        name: item.artist?.name || "Unknown",
      },
    }));

    return Response.json({ songs, artists, albums });
  } catch (error) {
    console.error("YTMusic search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
