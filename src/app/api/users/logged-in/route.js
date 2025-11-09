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

    // Get the filter type from query params (default to 'all')
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    let query = {};
    
    if (filter === 'online') {
      // Show only users active in last 5 minutes (truly online)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query.lastActive = { $gte: fiveMinutesAgo };
    } else if (filter === 'recent') {
      // Show users active in last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      query.lastActive = { $gte: thirtyMinutesAgo };
    }
    // If filter === 'all', no query filter - show everyone

    // Fetch all users based on filter
    const users = await User.find(query)
      .select('clerkId name email imageUrl currentlyPlaying lastActive status socketId')
      .sort({ lastActive: -1 })
      .limit(100); // Show up to 100 users

    // Determine online status for each user
    const now = Date.now();
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      const lastActiveTime = new Date(user.lastActive).getTime();
      const minutesSinceActive = (now - lastActiveTime) / (1000 * 60);
      
      // Determine status based on last active time
      let onlineStatus = 'offline';
      if (minutesSinceActive < 5) {
        onlineStatus = 'online';
      } else if (minutesSinceActive < 30) {
        onlineStatus = 'idle';
      }
      
      return {
        ...userObj,
        isOnline: onlineStatus === 'online',
        onlineStatus,
        minutesSinceActive: Math.floor(minutesSinceActive),
      };
    });

    return Response.json({
      success: true,
      users: usersWithStatus,
      count: usersWithStatus.length,
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}