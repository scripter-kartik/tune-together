import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/lib/models/ChatMessage";
import { areFriends, rateLimit } from "@/lib/chatGuards";
import { isBlockedEitherWay } from "@/lib/models/Block";

// Send an E2E-encrypted DM: { recipientId, ciphertext, iv }.
// (Legacy plaintext `message` still accepted while old clients drain.)
// Safety: friends only, blocks enforced, rate limited.
export async function POST(req) {
  try {
    const user = await currentUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(`dm-send:${user.id}`, 25, 10_000)) {
      return Response.json({ error: "Sending too fast, slow down" }, { status: 429 });
    }

    const { recipientId, message, ciphertext, iv } = await req.json();

    const hasEncrypted = ciphertext && iv;
    const hasPlain = typeof message === "string" && message.trim();
    if (!recipientId || (!hasEncrypted && !hasPlain)) {
      return Response.json(
        { error: "recipientId and message content are required" },
        { status: 400 }
      );
    }
    if (hasEncrypted && (typeof ciphertext !== "string" || ciphertext.length > 8192)) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }
    if (recipientId === user.id) {
      return Response.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    await connectDB();

    // Safety: only friends can DM each other, and blocks cut both ways.
    if (!(await areFriends(user.id, recipientId))) {
      return Response.json({ error: "You can only message friends" }, { status: 403 });
    }
    if (await isBlockedEitherWay(user.id, recipientId)) {
      return Response.json({ error: "You cannot message this user" }, { status: 403 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    const chatMessage = await ChatMessage.create({
      senderId: user.id,
      senderName: fullName,
      senderImage: user.imageUrl,
      recipientId,
      message: hasEncrypted ? null : message.trim(),
      ciphertext: hasEncrypted ? ciphertext : null,
      iv: hasEncrypted ? iv : null,
    });

    return Response.json({
      success: true,
      message: chatMessage,
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return Response.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
