import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupKey from "@/lib/models/GroupKey";
import GroupMessage from "@/lib/models/GroupMessage";
import User from "@/lib/models/User";
import { areFriends, memberOf, isAdmin } from "@/lib/chatGuards";
import { isBlockedEitherWay } from "@/lib/models/Block";

// Member management: { action: "add" | "remove" | "promote", userId, wrappedKey?, iv? }
// - add: admin only; target must be a friend of the admin; `wrappedKey`/`iv` is
//   the current group key wrapped for the new member (client-side).
// - remove: admin only; rotates the group key (bumps keyVersion).
// - promote: admin only; makes target an admin.
export async function POST(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action, userId, wrappedKey, iv } = await req.json();
    if (!userId || !["add", "remove", "promote"].includes(action)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectDB();
    const group = await Group.findById(id);
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
    if (!isAdmin(group, user.id)) {
      return Response.json({ error: "Only admins can manage members" }, { status: 403 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
    const target = await User.findOne({ clerkId: userId }).select("name").lean();
    const targetName = target?.name || "User";

    switch (action) {
      case "add": {
        if (memberOf(group, userId)) {
          return Response.json({ error: "Already a member" }, { status: 400 });
        }
        if (group.members.length >= 100) {
          return Response.json({ error: "Group is full (100 members)" }, { status: 400 });
        }
        // Safety: can only add your own friends, and never across a block.
        if (!(await areFriends(user.id, userId))) {
          return Response.json({ error: "You can only add your friends" }, { status: 403 });
        }
        if (await isBlockedEitherWay(user.id, userId)) {
          return Response.json({ error: "This user is blocked" }, { status: 403 });
        }
        if (!wrappedKey || !iv) {
          return Response.json({ error: "wrappedKey required for E2EE" }, { status: 400 });
        }

        group.members.push({ clerkId: userId, role: "member" });
        await group.save();
        await GroupKey.findOneAndUpdate(
          { groupId: group._id, memberId: userId, keyVersion: group.keyVersion },
          {
            groupId: group._id,
            memberId: userId,
            keyVersion: group.keyVersion,
            wrapperId: user.id,
            wrappedKey,
            iv,
          },
          { upsert: true }
        );
        await GroupMessage.create({
          groupId: group._id,
          senderId: user.id,
          senderName: fullName,
          senderImage: user.imageUrl,
          type: "system",
          systemText: `${fullName} added ${targetName}`,
        });
        return Response.json({ success: true });
      }

      case "remove": {
        if (!memberOf(group, userId)) {
          return Response.json({ error: "Not a member" }, { status: 400 });
        }
        if (userId === user.id) {
          return Response.json({ error: "Use leave instead" }, { status: 400 });
        }
        group.members = group.members.filter((m) => m.clerkId !== userId);
        // Rotate: removed member must not read anything sent after this.
        group.keyVersion += 1;
        await group.save();
        await GroupKey.deleteMany({ groupId: group._id, memberId: userId });
        await GroupMessage.create({
          groupId: group._id,
          senderId: user.id,
          senderName: fullName,
          senderImage: user.imageUrl,
          type: "system",
          systemText: `${fullName} removed ${targetName}`,
        });
        return Response.json({ success: true, keyRotationNeeded: true });
      }

      case "promote": {
        const m = memberOf(group, userId);
        if (!m) {
          return Response.json({ error: "Not a member" }, { status: 400 });
        }
        m.role = "admin";
        await group.save();
        await GroupMessage.create({
          groupId: group._id,
          senderId: user.id,
          senderName: fullName,
          senderImage: user.imageUrl,
          type: "system",
          systemText: `${fullName} made ${targetName} an admin`,
        });
        return Response.json({ success: true });
      }
    }
  } catch (error) {
    console.error("Error managing members:", error);
    return Response.json({ error: "Failed to manage members" }, { status: 500 });
  }
}
