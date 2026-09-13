import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import PlayHistory from "@/lib/models/PlayHistory";
import Playlist from "@/lib/models/Playlist";
import Friendship from "@/lib/models/Friendship";
import { toPublicProfile } from "@/lib/presence";



export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").toLowerCase().trim();
    const clerkId = searchParams.get("id");

    await connectDB();

    let user;
    if (clerkId) {
      user = await User.findOne({ clerkId });
    } else if (username) {
      user = await User.findOne({ username });
    }
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const profile = toPublicProfile(user);

    
    const totalPlays = await PlayHistory.countDocuments({ clerkId: user.clerkId });
    const artistRows = await PlayHistory.aggregate([
      { $match: { clerkId: user.clerkId } },
      { $group: { _id: "$artistName", count: { $sum: 1 }, artistId: { $first: "$artistId" }, image: { $first: "$albumArt" } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const topArtists = artistRows
      .filter((r) => r._id && r._id !== "Unknown Artist")
      .map((r) => ({
        id: r.artistId,
        name: r._id,
        image: r.image && r.image !== "/icon2.png" ? r.image : null,
        count: r.count,
      }));

    const recentRows = await PlayHistory.find({ clerkId: user.clerkId })
      .sort({ playedAt: -1 })
      .limit(12)
      .lean();
    const recentSongs = recentRows.map((doc) => ({
      id: doc.songId,
      title: doc.title,
      artist: { name: doc.artistName, id: doc.artistId || null },
      album: {
        id: null,
        title: "",
        cover_medium: `https://i.ytimg.com/vi/${doc.songId}/mqdefault.jpg`,
        cover_small: `https://i.ytimg.com/vi/${doc.songId}/mqdefault.jpg`,
        cover_big: `https://i.ytimg.com/vi/${doc.songId}/mqdefault.jpg`,
      },
      duration: 0,
      youtubeId: doc.songId,
      playedAt: doc.playedAt,
    }));


    const playlists = await Playlist.find({
      $or: [{ userId: user.clerkId }, { collaborators: user.clerkId }],
    }).sort({ createdAt: -1 });
    const publicPlaylists = playlists.map((p) => ({
      id: p._id,
      name: p.name,
      image: p.image || "",
      songCount: p.songs?.length || 0,
      isCollaborative: p.isCollaborative || (p.collaborators?.length > 0),
      collaboratorsCount: p.collaborators?.length || 0,
    }));


    const [followerRows, followingRows] = await Promise.all([
      Friendship.find({ recipientId: user.clerkId, status: "accepted" }).countDocuments().catch(() => 0),
      Friendship.find({ requesterId: user.clerkId, status: "accepted" }).countDocuments().catch(() => 0),
    ]);

    return Response.json({
      success: true,
      profile,
      stats: { totalPlays, topArtists, recentSongs },
      playlists: publicPlaylists,
      counts: { followers: followerRows, following: followingRows },
    });
  } catch (error) {
    console.error("Profile error:", error);
    return Response.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
