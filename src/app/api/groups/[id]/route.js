import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupKey from "@/lib/models/GroupKey";
import GroupMessage from "@/lib/models/GroupMessage";
import User from "@/lib/models/User";
import { memberOf, isAdmin } from "@/lib/chatGuards";

// Get one group (members hydrated). Must be a member.
export async function GET(_req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const group = await Group.findById(id).lean();
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const users = await User.find({
      clerkId: { $in: group.members.map((m) => m.clerkId) },
    })
      .select("clerkId name username imageUrl lastActive currentlyPlaying")
      .lean();
    const byId = new Map(users.map((u) => [u.clerkId, u]));

    return Response.json({
      success: true,
      group: {
        ...group,
        members: group.members.map((m) => ({ ...m, profile: byId.get(m.clerkId) || null })),
      },
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return Response.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

// Group actions: { action: "rename" | "leave" | "delete" | "set-room", ... }
export async function POST(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const group = await Group.findById(id);
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";

    switch (body.action) {
      case "rename": {
        if (!isAdmin(group, user.id)) {
          return Response.json({ error: "Only admins can rename" }, { status: 403 });
        }
        const name = (body.name || "").trim();
        if (!name || name.length > 50) {
          return Response.json({ error: "Name must be 1-50 characters" }, { status: 400 });
        }
        group.name = name;
        if (body.icon !== undefined) group.icon = body.icon || null;
        await group.save();
        await GroupMessage.create({
          groupId: group._id,
          senderId: user.id,
          senderName: fullName,
          senderImage: user.imageUrl,
          type: "system",
          systemText: `${fullName} renamed the group to "${name}"`,
        });
        return Response.json({ success: true });
      }

      case "leave": {
        group.members = group.members.filter((m) => m.clerkId !== user.id);
        if (group.members.length === 0) {
          await Group.deleteOne({ _id: group._id });
          await GroupMessage.deleteMany({ groupId: group._id });
          await GroupKey.deleteMany({ groupId: group._id });
          return Response.json({ success: true, deleted: true });
        }
        // Ensure at least one admin remains.
        if (!group.members.some((m) => m.role === "admin")) {
          group.members[0].role = "admin";
        }
        // Departing member must not be able to read future messages:
        // bump keyVersion; a remaining admin re-wraps a fresh key on next load.
        group.keyVersion += 1;
        await group.save();
        await GroupKey.deleteMany({ groupId: group._id, memberId: user.id });
        await GroupMessage.create({
          groupId: group._id,
          senderId: user.id,
          senderName: fullName,
          senderImage: user.imageUrl,
          type: "system",
          systemText: `${fullName} left the group`,
        });
        return Response.json({ success: true, keyRotationNeeded: true });
      }

      case "delete": {
        if (!isAdmin(group, user.id)) {
          return Response.json({ error: "Only admins can delete the group" }, { status: 403 });
        }
        await Group.deleteOne({ _id: group._id });
        await GroupMessage.deleteMany({ groupId: group._id });
        await GroupKey.deleteMany({ groupId: group._id });
        return Response.json({ success: true, deleted: true });
      }

      case "set-room": {
        // Link/unlink a listening session room to this group.
        group.linkedRoomId = body.roomId || null;
        await group.save();
        if (body.roomId) {
          await GroupMessage.create({
            groupId: group._id,
            senderId: user.id,
            senderName: fullName,
            senderImage: user.imageUrl,
            type: "session-invite",
            roomId: body.roomId,
            systemText: `${fullName} started a listening session`,
          });
        }
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating group:", error);
    return Response.json({ error: "Failed to update group" }, { status: 500 });
  }
}
