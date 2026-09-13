import { getYTMusic } from "@/lib/ytmusic";

const thumbnail = (item, index) =>
  item.thumbnails?.[index]?.url || item.thumbnails?.[item.thumbnails?.length - 1]?.url || "/icon2.png";

const toSong = (item) => ({
  id: item.videoId,
  youtubeId: item.videoId,
  title: item.name || "Unknown track",
  artist: {
    name: item.artist?.name || "Unknown artist",
    id: item.artist?.artistId || null,
  },
  album: {
    id: item.album?.albumId || null,
    title: item.album?.name || "Unknown album",
    cover_small: thumbnail(item, 0),
    cover_medium: thumbnail(item, 1),
    cover_big: thumbnail(item),
  },
  duration: item.duration || 0,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId") || "";
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";

  if (!title && !artist) {
    return Response.json({ songs: [] }, { status: 400 });
  }

  try {
    const ytmusic = await getYTMusic();


    const [trackMatches, artistMatches] = await Promise.all([
      ytmusic.searchSongs(`${title} ${artist}`.trim()).catch(() => []),
      ytmusic.searchSongs(`${artist} songs`.trim()).catch(() => []),
    ]);

    const seen = new Set([videoId]);
    const songs = [];
    for (const item of [...trackMatches, ...artistMatches]) {
      if (!item?.videoId || seen.has(item.videoId)) continue;
      seen.add(item.videoId);
      songs.push(toSong(item));
      if (songs.length === 20) break;
    }
    return Response.json({ songs });
  } catch (error) {
    console.error("Autoplay recommendations error:", error);
    return Response.json({ songs: [] });
  }
}
