import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import PlayHistory from "@/lib/models/PlayHistory";

// Record a play for the logged-in user.
export async function POST(req) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { song } = await req.json();
    if (!song?.id) {
      return Response.json({ error: "Missing song" }, { status: 400 });
    }

    await connectDB();

    await PlayHistory.create({
      clerkId: clerkUser.id,
      songId: String(song.id),
      title: song.title || "",
      artistId: song.artist?.id ? String(song.artist.id) : null,
      artistName: song.artist?.name || "Unknown Artist",
      albumArt:
        song.album?.cover_medium ||
        song.album?.cover_small ||
        song.album?.cover_big ||
        "/icon2.png",
      playedAt: new Date(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error recording play history:", error);
    return Response.json({ error: "Failed to record play" }, { status: 500 });
  }
}

// Return the logged-in user's most-listened artists + songs by those artists.
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ topArtists: [], songs: [] });
    }

    await connectDB();
    const clerkId = clerkUser.id;

    // Most-played artists (by number of plays).
    const artistRows = await PlayHistory.aggregate([
      { $match: { clerkId } },
      { $sort: { playedAt: -1 } },
      {
        $group: {
          _id: "$artistName",
          count: { $sum: 1 },
          artistId: { $first: "$artistId" },
          image: { $first: "$albumArt" },
          lastPlayed: { $max: "$playedAt" },
        },
      },
      { $sort: { count: -1, lastPlayed: -1 } },
      { $limit: 8 },
    ]);

    const topArtists = artistRows
      .filter((r) => r._id && r._id !== "Unknown Artist")
      .map((r) => ({
        id: r.artistId,
        name: r._id,
        image: r.image || "/icon2.png",
        count: r.count,
      }));

    // Recent distinct songs by those top artists, reconstructed into the
    // same shape the player expects (youtubeId === id).
    const topNames = topArtists.map((a) => a.name);
    let songs = [];
    if (topNames.length) {
      const songRows = await PlayHistory.aggregate([
        { $match: { clerkId, artistName: { $in: topNames } } },
        { $sort: { playedAt: -1 } },
        { $group: { _id: "$songId", doc: { $first: "$$ROOT" } } },
        { $sort: { "doc.playedAt": -1 } },
        { $limit: 30 },
      ]);

      songs = songRows.map(({ doc }) => ({
        id: doc.songId,
        title: doc.title,
        artist: { name: doc.artistName, id: doc.artistId || null },
        album: {
          id: null,
          title: "",
          cover_medium: doc.albumArt,
          cover_small: doc.albumArt,
          cover_big: doc.albumArt,
        },
        duration: 0,
        youtubeId: doc.songId,
      }));
    }

    return Response.json({ topArtists, songs });
  } catch (error) {
    console.error("Error fetching play history:", error);
    return Response.json({ topArtists: [], songs: [] }, { status: 200 });
  }
}
