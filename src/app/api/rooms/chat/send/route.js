import { connectDB } from "@/lib/db";
import RoomMessage from "@/lib/models/RoomMessage";

export async function POST(req) {
  try {
    const { roomId, senderId, senderName, senderImage, message } = await req.json();

    if (!roomId || !senderId || !senderName || !message) {
      return Response.json(
        { error: "roomId, senderId, senderName, and message are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const chatMessage = await RoomMessage.create({
      roomId,
      senderId,
      senderName,
      senderImage,
      message: message.trim(),
    });

    return Response.json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    console.error("Error sending room message:", error);
    return Response.json(
      { error: "Failed to send room message" },
      { status: 500 }
    );
  }
}
