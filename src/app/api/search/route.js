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

    // Use the dedicated endpoints instead of the generic search(): the generic
    // one mixes types and only returns a handful of songs, whereas searchSongs
    // returns a full page (~20). Run them in parallel; a failure in one
    // category shouldn't sink the whole response.
    const [songResults, artistResults, albumResults] = await Promise.all([
      ytmusic.searchSongs(q).catch(() => []),
      ytmusic.searchArtists(q).catch(() => []),
      ytmusic.searchAlbums(q).catch(() => []),
    ]);

    const songs = (songResults || []).map(item => ({
      id: item.videoId,
      title: item.name,
      artist: {
        name: item.artist?.name || "Unknown",
        id: item.artist?.artistId || null,
      },
      album: {
        id: item.album?.albumId || null,
        title: item.album?.name || "Unknown",
        cover_medium: lastThumb(item),
      },
      duration: item.duration || 0,
      youtubeId: item.videoId, // Tell the frontend it already has the yt ID
    }));

    const artists = (artistResults || []).map(item => ({
      id: item.artistId,
      name: item.name,
      picture_medium: lastThumb(item),
    }));

    const albums = (albumResults || []).map(item => ({
      id: item.albumId,
      title: item.name,
      cover_medium: lastThumb(item),
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
