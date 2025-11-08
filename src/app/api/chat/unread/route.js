// ============================================
// FILE 6: src/app/api/chat/unread/route.js (NEW)
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

    await connectDB();

    // Get unread message counts per sender
    const unreadCounts = await ChatMessage.aggregate([
      {
        $match: {
          recipientId: user.id,
          read: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    return Response.json({
      success: true,
      unreadCounts,
    });

  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return Response.json(
      { error: "Failed to fetch unread counts" },
      { status: 500 }
    );
  }
}