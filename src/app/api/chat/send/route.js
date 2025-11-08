// ============================================
// FILE 5: src/app/api/chat/send/route.js (NEW)
// ============================================

import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/lib/models/ChatMessage";

export async function POST(req) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientId, message } = await req.json();

    if (!recipientId || !message) {
      return Response.json(
        { error: "recipientId and message are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    const chatMessage = await ChatMessage.create({
      senderId: user.id,
      senderName: fullName,
      senderImage: user.imageUrl,
      recipientId,
      message: message.trim(),
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
