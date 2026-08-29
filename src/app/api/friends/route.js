import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Friendship from "@/lib/models/Friendship";
import { toPublicProfile } from "@/lib/presence";



export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const me = clerkUser.id;

    const rows = await Friendship.find({
      $or: [{ requesterId: me }, { recipientId: me }],
    }).lean();

    const friendIds = [];
    const incomingIds = []; 
    const outgoingIds = []; 

    for (const r of rows) {
      const other = r.requesterId === me ? r.recipientId : r.requesterId;
      if (r.status === "accepted") friendIds.push(other);
      else if (r.recipientId === me) incomingIds.push(r.requesterId);
      else outgoingIds.push(r.recipientId);
    }

    const allIds = [...new Set([...friendIds, ...incomingIds, ...outgoingIds])];
    const users = allIds.length
      ? await User.find({ clerkId: { $in: allIds } })
          .select("clerkId name username imageUrl lastActive currentlyPlaying")
          .lean()
      : [];

    const byId = new Map(users.map((u) => [u.clerkId, toPublicProfile(u)]));
    const pick = (ids) => ids.map((id) => byId.get(id)).filter(Boolean);

    const friends = pick(friendIds).sort((a, b) => {
      
      const rank = (u) => (u.onlineStatus === "online" ? 0 : u.onlineStatus === "idle" ? 1 : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (a.name || "").localeCompare(b.name || "");
    });

    return Response.json({
      success: true,
      friends,
      incoming: pick(incomingIds),
      outgoing: pick(outgoingIds),
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return Response.json({ error: "Failed to fetch friends" }, { status: 500 });
  }
}
