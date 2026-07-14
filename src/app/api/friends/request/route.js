import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Friendship from "@/lib/models/Friendship";

// Send a friend request by @username. Idempotent-ish: rejects duplicates and
// auto-accepts if the target had already requested you.
export async function POST(req) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase().replace(/^@/, "");
    if (!username) {
      return Response.json({ error: "Enter a username." }, { status: 400 });
    }

    await connectDB();
    const me = clerkUser.id;

    const target = await User.findOne({ username }).select("clerkId name username imageUrl");
    if (!target) {
      return Response.json({ error: `No user @${username} found.` }, { status: 404 });
    }
    if (target.clerkId === me) {
      return Response.json({ error: "You can't add yourself." }, { status: 400 });
    }

    // Any existing relationship in either direction?
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: me, recipientId: target.clerkId },
        { requesterId: target.clerkId, recipientId: me },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return Response.json({ error: "You're already friends." }, { status: 409 });
      }
      // They already asked me → accept it now.
      if (existing.requesterId === target.clerkId) {
        existing.status = "accepted";
        await existing.save();
        return Response.json({
          success: true,
          status: "accepted",
          friend: { clerkId: target.clerkId, name: target.name, username: target.username },
        });
      }
      return Response.json({ error: "Request already sent." }, { status: 409 });
    }

    await Friendship.create({ requesterId: me, recipientId: target.clerkId, status: "pending" });

    return Response.json({
      success: true,
      status: "pending",
      recipientId: target.clerkId,
      friend: { clerkId: target.clerkId, name: target.name, username: target.username },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ error: "Request already sent." }, { status: 409 });
    }
    console.error("Error sending friend request:", error);
    return Response.json({ error: "Failed to send request" }, { status: 500 });
  }
}
