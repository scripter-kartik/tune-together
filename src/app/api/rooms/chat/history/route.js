import { connectDB } from "@/lib/db";
import RoomMessage from "@/lib/models/RoomMessage";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return Response.json({ error: "roomId is required" }, { status: 400 });
    }

    await connectDB();

    const messages = await RoomMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(200);

    return Response.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching room chat history:", error);
    return Response.json(
      { error: "Failed to fetch room chat history" },
      { status: 500 }
    );
  }
}
