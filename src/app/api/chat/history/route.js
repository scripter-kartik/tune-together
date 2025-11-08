// ============================================
// FILE 4: src/app/api/chat/history/route.js (NEW)
// ============================================

import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/lib/models/ChatMessage";

export async function GET(req) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    await connectDB();

    // Get messages between these two users
    const messages = await ChatMessage.find({
      $or: [
        { senderId: user.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        senderId: otherUserId,
        recipientId: user.id,
        read: false,
      },
      { read: true }
    );

    return Response.json({
      success: true,
      messages,
    });

  } catch (error) {
    console.error("Error fetching chat history:", error);
    return Response.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
