// src/app/api/chat/unread/route.js

import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/lib/models/ChatMessage";

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const unreadCount = await ChatMessage.countDocuments({
      recipientId: user.id,
      read: false,
      deletedByRecipient: false,
    });

    return Response.json({
      success: true,
      unreadCount,
    });

  } catch (error) {
    console.error("Error fetching unread count:", error);
    return Response.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}