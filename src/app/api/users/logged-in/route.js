// src/app/api/users/logged-in/route.js

import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function GET(req) {
  try {
    // Check if user is authenticated
    const user = await currentUser();
    
    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Fetch all users who have logged in recently (active in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const loggedInUsers = await User.find({
      lastActive: { $gte: thirtyMinutesAgo }
    })
      .select('clerkId name email imageUrl currentlyPlaying lastActive status')
      .sort({ lastActive: -1 })
      .limit(50);

    return Response.json({
      success: true,
      users: loggedInUsers
    });

  } catch (error) {
    console.error("Error fetching logged-in users:", error);
    return Response.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}