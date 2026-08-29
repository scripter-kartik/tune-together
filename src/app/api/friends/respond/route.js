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
    const requesterId = String(body.requesterId || "");
    const action = body.action === "accept" ? "accept" : "decline";
    if (!requesterId) {
      return Response.json({ error: "Missing requester." }, { status: 400 });
    }

    await connectDB();
    const me = clerkUser.id;

    const request = await Friendship.findOne({
      requesterId,
      recipientId: me,
      status: "pending",
    });
    if (!request) {
      return Response.json({ error: "Request not found." }, { status: 404 });
    }

    if (action === "accept") {
      request.status = "accepted";
      await request.save();
    } else {
      await request.deleteOne();
    }

    return Response.json({ success: true, action, requesterId });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return Response.json({ error: "Failed to respond" }, { status: 500 });
  }
}
