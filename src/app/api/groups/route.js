import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupKey from "@/lib/models/GroupKey";
import GroupMessage from "@/lib/models/GroupMessage";
import User from "@/lib/models/User";
import { areFriends, rateLimit } from "@/lib/chatGuards";
import { isBlockedEitherWay } from "@/lib/models/Block";


export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const groups = await Group.find({ "members.clerkId": user.id })
      .sort({ updatedAt: -1 })
      .lean();

    
    const memberIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.clerkId)))];
    const users = memberIds.length
      ? await User.find({ clerkId: { $in: memberIds } })
          .select("clerkId name username imageUrl lastActive")
          .lean()
      : [];
    const byId = new Map(users.map((u) => [u.clerkId, u]));

    const result = groups.map((g) => ({
      ...g,
      members: g.members.map((m) => ({ ...m, profile: byId.get(m.clerkId) || null })),
    }));

    return Response.json({ success: true, groups: result });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return Response.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}





export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!rateLimit(`group-create:${user.id}`, 5, 60_000)) {
      return Response.json({ error: "Too many groups created, slow down" }, { status: 429 });
    }

    const { name, icon, memberIds, wrappedKeys } = await req.json();

    const cleanName = (name || "").trim();
    if (!cleanName || cleanName.length > 50) {
      return Response.json({ error: "Group name must be 1-50 characters" }, { status: 400 });
    }
    if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 100) {
      return Response.json({ error: "Pick 1-100 members" }, { status: 400 });
    }
    if (!Array.isArray(wrappedKeys)) {
      return Response.json({ error: "wrappedKeys required" }, { status: 400 });
    }

    await connectDB();

    
    const others = [...new Set(memberIds.filter((id) => id !== user.id))];
    for (const id of others) {
      if (!(await areFriends(user.id, id))) {
        return Response.json(
          { error: "You can only add friends to a group" },
          { status: 403 }
        );
      }
      if (await isBlockedEitherWay(user.id, id)) {
        return Response.json({ error: "One of these users is blocked" }, { status: 403 });
      }
    }

    const group = await Group.create({
      name: cleanName,
      icon: icon || null,
      createdBy: user.id,
      keyVersion: 1,
      members: [
        { clerkId: user.id, role: "admin" },
        ...others.map((id) => ({ clerkId: id, role: "member" })),
      ],
    });

    
    const allMemberIds = new Set([user.id, ...others]);
    const keyDocs = wrappedKeys
      .filter((k) => allMemberIds.has(k.memberId) && k.wrappedKey && k.iv)
      .map((k) => ({
        groupId: group._id,
        memberId: k.memberId,
        keyVersion: 1,
        wrapperId: user.id,
        wrappedKey: k.wrappedKey,
        iv: k.iv,
      }));
    if (keyDocs.length) await GroupKey.insertMany(keyDocs);

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
    await GroupMessage.create({
      groupId: group._id,
      senderId: user.id,
      senderName: fullName,
      senderImage: user.imageUrl,
      type: "system",
      systemText: `${fullName} created the group`,
    });

    return Response.json({ success: true, group });
  } catch (error) {
    console.error("Error creating group:", error);
    return Response.json({ error: "Failed to create group" }, { status: 500 });
  }
}
