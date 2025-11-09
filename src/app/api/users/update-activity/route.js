import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req) {
  try {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentlyPlaying, status } = body;

    await connectDB();

    const updateData = {
      lastActive: new Date(),
      clerkId: clerkUser.id,
      name: clerkUser.firstName + (clerkUser.lastName ? ` ${clerkUser.lastName}` : ''),
      email: clerkUser.emailAddresses[0]?.emailAddress,
      imageUrl: clerkUser.imageUrl,
    };

    if (currentlyPlaying) {
      updateData.currentlyPlaying = currentlyPlaying;
    }

    if (status) {
      updateData.status = status;
    }

    const user = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return Response.json({
      success: true,
      user: {
        clerkId: user.clerkId,
        name: user.name,
        lastActive: user.lastActive,
        currentlyPlaying: user.currentlyPlaying,
        status: user.status,
      }
    });

  } catch (error) {
    console.error("Error updating user activity:", error);
    return Response.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}


export async function DELETE() {
  try {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { 
        $set: { 
          lastActive: new Date(),
          currentlyPlaying: null 
        } 
      }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error clearing currently playing:", error);
    return Response.json(
      { error: "Failed to clear activity" },
      { status: 500 }
    );
  }
}