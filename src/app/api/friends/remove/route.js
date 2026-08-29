import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Friendship from "@/lib/models/Friendship";


export async function POST(req) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const friendId = String(body.friendId || "");
    if (!friendId) {
      return Response.json({ error: "Missing friend." }, { status: 400 });
    }

    await connectDB();
    const me = clerkUser.id;

    await Friendship.deleteOne({
      $or: [
        { requesterId: me, recipientId: friendId },
        { requesterId: friendId, recipientId: me },
      ],
    });

    return Response.json({ success: true, friendId });
  } catch (error) {
    console.error("Error removing friend:", error);
    return Response.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
