import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function GET(req) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    let query = {};
    
    if (filter === 'online') {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query.lastActive = { $gte: fiveMinutesAgo };
    } else if (filter === 'recent') {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      query.lastActive = { $gte: thirtyMinutesAgo };
    }

    const users = await User.find(query)
      .select('clerkId name email imageUrl currentlyPlaying lastActive status socketId')
      .sort({ lastActive: -1 })
      .limit(100); 

    const now = Date.now();
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      const lastActiveTime = new Date(user.lastActive).getTime();
      const minutesSinceActive = (now - lastActiveTime) / (1000 * 60);
      
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