import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupMessage from "@/lib/models/GroupMessage";
import { memberOf, isAdmin, rateLimit } from "@/lib/chatGuards";

// Actions on a single group message. PATCH body:
//   { action: "react",  emoji }            — toggle/replace my reaction
//   { action: "edit",   ciphertext, iv }   — sender only
//   { action: "delete" }                   — sender or a group admin
// Client relays the returned row over the socket ("group-message-updated").
export async function PATCH(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!rateLimit(`group-action:${user.id}`, 30, 10_000)) {
      return Response.json({ error: "Too many actions, slow down" }, { status: 429 });
    }

    const { id, msgId } = await params;
    if (!mongoose.isValidObjectId(msgId)) {
      return Response.json({ error: "Invalid message id" }, { status: 400 });
    }
    const { action, emoji, ciphertext, iv } = await req.json();

    await connectDB();
    const group = await Group.findById(id).lean();
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const msg = await GroupMessage.findOne({ _id: msgId, groupId: group._id });
    if (!msg) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }
    if (msg.type !== "text" && action !== "react") {
      return Response.json({ error: "Cannot modify this message" }, { status: 400 });
    }

    if (action === "react") {
      if (msg.deletedForEveryone) {
        return Response.json({ error: "Message was deleted" }, { status: 400 });
      }
      if (typeof emoji !== "string" || !emoji || emoji.length > 16) {
        return Response.json({ error: "Invalid emoji" }, { status: 400 });
      }
      const mine = msg.reactions.find((r) => r.userId === user.id);
      if (mine && mine.emoji === emoji) {
        msg.reactions = msg.reactions.filter((r) => r.userId !== user.id);
      } else {
        msg.reactions = [
          ...msg.reactions.filter((r) => r.userId !== user.id),
          { emoji, userId: user.id },
        ];
      }
    } else if (action === "edit") {
      if (msg.senderId !== user.id) {
        return Response.json({ error: "You can only edit your own messages" }, { status: 403 });
      }
      if (msg.deletedForEveryone) {
        return Response.json({ error: "Message was deleted" }, { status: 400 });
      }
      if (!ciphertext || !iv || typeof ciphertext !== "string" || ciphertext.length > 8192) {
        return Response.json({ error: "Invalid message" }, { status: 400 });
      }
      msg.ciphertext = ciphertext;
      msg.iv = iv;
      msg.edited = true;
    } else if (action === "delete") {
      if (msg.senderId !== user.id && !isAdmin(group, user.id)) {
        return Response.json({ error: "You can only delete your own messages" }, { status: 403 });
      }
      msg.deletedForEveryone = true;
      msg.ciphertext = null;
      msg.iv = null;
      msg.reactions = [];
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    await msg.save();
    return Response.json({ success: true, message: msg });
  } catch (error) {
    console.error("Error updating group message:", error);
    return Response.json({ error: "Failed to update message" }, { status: 500 });
  }
}
