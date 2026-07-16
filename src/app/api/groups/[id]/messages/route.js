import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupMessage from "@/lib/models/GroupMessage";
import { memberOf, rateLimit } from "@/lib/chatGuards";

// Message history for a group. Members only. ?before=<iso> for pagination.
export async function GET(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const group = await Group.findById(id).lean();
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const before = new URL(req.url).searchParams.get("before");
    const query = { groupId: group._id };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await GroupMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return Response.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// Send an encrypted message: { ciphertext, iv, keyVersion }
// The server never sees plaintext — it stores and relays opaque blobs.
export async function POST(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!rateLimit(`group-send:${user.id}`, 25, 10_000)) {
      return Response.json({ error: "Sending too fast, slow down" }, { status: 429 });
    }

    const { id } = await params;
    const { ciphertext, iv, keyVersion, replyToId } = await req.json();
    if (!ciphertext || !iv || typeof ciphertext !== "string" || ciphertext.length > 8192) {
      return Response.json({ error: "Invalid message" }, { status: 400 });
    }

    await connectDB();
    const group = await Group.findById(id);
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";

    // Replies must point at a message in this group.
    let replyTo = null;
    if (replyToId && mongoose.isValidObjectId(replyToId)) {
      const target = await GroupMessage.findOne({ _id: replyToId, groupId: group._id }).lean();
      if (target) replyTo = target._id;
    }

    const message = await GroupMessage.create({
      groupId: group._id,
      senderId: user.id,
      senderName: fullName,
      senderImage: user.imageUrl,
      type: "text",
      ciphertext,
      iv,
      keyVersion: keyVersion || group.keyVersion,
      replyToId: replyTo,
    });

    // Bump group activity so the sidebar sorts by recency.
    group.updatedAt = new Date();
    await group.save();

    return Response.json({ success: true, message });
  } catch (error) {
    console.error("Error sending group message:", error);
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
