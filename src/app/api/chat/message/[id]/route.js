import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/lib/models/ChatMessage";
import { rateLimit } from "@/lib/chatGuards";







export async function PATCH(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!rateLimit(`dm-action:${user.id}`, 30, 10_000)) {
      return Response.json({ error: "Too many actions, slow down" }, { status: 429 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ error: "Invalid message id" }, { status: 400 });
    }
    const { action, emoji, ciphertext, iv } = await req.json();

    await connectDB();
    const msg = await ChatMessage.findById(id);
    if (!msg || (msg.senderId !== user.id && msg.recipientId !== user.id)) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }
    if (msg.deletedForEveryone && action !== "react") {
      return Response.json({ error: "Message was deleted" }, { status: 400 });
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
      if (!ciphertext || !iv || typeof ciphertext !== "string" || ciphertext.length > 8192) {
        return Response.json({ error: "Invalid message" }, { status: 400 });
      }
      msg.ciphertext = ciphertext;
      msg.iv = iv;
      msg.message = null;
      msg.edited = true;
    } else if (action === "delete") {
      if (msg.senderId !== user.id) {
        return Response.json({ error: "You can only delete your own messages" }, { status: 403 });
      }
      msg.deletedForEveryone = true;
      msg.ciphertext = null;
      msg.iv = null;
      msg.message = null;
      msg.reactions = [];
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    await msg.save();
    return Response.json({ success: true, message: msg });
  } catch (error) {
    console.error("Error updating message:", error);
    return Response.json({ error: "Failed to update message" }, { status: 500 });
  }
}
