import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

// Return the signed-in user's profile (creating the record if this is their
// first visit), so the client knows whether they've claimed a @username yet.
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const name =
      clerkUser.firstName + (clerkUser.lastName ? ` ${clerkUser.lastName}` : "");

    const user = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      {
        $set: {
          clerkId: clerkUser.id,
          name: name || clerkUser.username || "Listener",
          email: clerkUser.emailAddresses[0]?.emailAddress,
          imageUrl: clerkUser.imageUrl,
          lastActive: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({
      success: true,
      me: {
        clerkId: user.clerkId,
        name: user.name,
        username: user.username || null,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
