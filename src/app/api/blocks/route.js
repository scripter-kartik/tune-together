import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Block from "@/lib/models/Block";
import User from "@/lib/models/User";

// List users I've blocked.
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const rows = await Block.find({ blockerId: user.id }).lean();
    const ids = rows.map((r) => r.blockedId);
    const users = ids.length
      ? await User.find({ clerkId: { $in: ids } })
          .select("clerkId name username imageUrl")
          .lean()
      : [];

    return Response.json({ success: true, blocked: users });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return Response.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}

// Block or unblock a user: { userId, action: "block" | "unblock" }
export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json();
    if (!userId || userId === user.id || !["block", "unblock"].includes(action)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectDB();

    if (action === "block") {
      await Block.findOneAndUpdate(
        { blockerId: user.id, blockedId: userId },
        { blockerId: user.id, blockedId: userId },
        { upsert: true }
      );
    } else {
      await Block.deleteOne({ blockerId: user.id, blockedId: userId });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating block:", error);
    return Response.json({ error: "Failed to update block" }, { status: 500 });
  }
}
