import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin", "root", "support", "help", "tunetogether", "system", "moderator",
  "null", "undefined", "me", "you",
]);


export async function POST(req) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return Response.json(
        { error: "3–20 characters, letters, numbers or underscores only." },
        { status: 400 }
      );
    }
    if (RESERVED.has(username)) {
      return Response.json({ error: "That username is reserved." }, { status: 400 });
    }

    await connectDB();


    const existing = await User.findOne({ username }).select("clerkId");
    if (existing && existing.clerkId !== clerkUser.id) {
      return Response.json({ error: "That username is taken." }, { status: 409 });
    }

    const name =
      clerkUser.firstName + (clerkUser.lastName ? ` ${clerkUser.lastName}` : "");

    const user = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      {
        $set: {
          username,
          clerkId: clerkUser.id,
          name: name || "Listener",
          email: clerkUser.emailAddresses[0]?.emailAddress,
          imageUrl: clerkUser.imageUrl,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true, username: user.username });
  } catch (error) {
    
    if (error?.code === 11000) {
      return Response.json({ error: "That username is taken." }, { status: 409 });
    }
    console.error("Error setting username:", error);
    return Response.json({ error: "Failed to set username" }, { status: 500 });
  }
}
