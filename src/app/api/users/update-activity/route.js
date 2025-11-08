// src/app/api/users/update-activity/route.js

import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

// POST - Update user activity (heartbeat)
export async function POST(req) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get user's full name
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    // Update or create user with current activity
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: user.id },
      {
        clerkId: user.id,
        name: fullName,
        email: user.emailAddresses[0].emailAddress,
        imageUrl: user.imageUrl,
        lastActive: new Date(),
        status: 'online'
      },
      { upsert: true, new: true }
    );

    return Response.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating activity:", error);
    return Response.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// PUT - Update currently playing song
export async function PUT(req) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    await connectDB();

    // If songData is null/undefined, clear currently playing
    if (!body || !body.songId) {
      const updatedUser = await User.findOneAndUpdate(
        { clerkId: user.id },
        {
          lastActive: new Date(),
          currentlyPlaying: null,
          status: 'online'
        },
        { new: true }
      );

      return Response.json({
        success: true,
        user: updatedUser
      });
    }

    const { songId, songTitle, artist, albumArt } = body;

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: user.id },
      {
        lastActive: new Date(),
        currentlyPlaying: {
          songId,
          songTitle,
          artist,
          albumArt,
          startedAt: new Date()
        },
        status: 'online'
      },
      { new: true }
    );

    return Response.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating song:", error);
    return Response.json(
      { error: "Failed to update song" },
      { status: 500 }
    );
  }
}