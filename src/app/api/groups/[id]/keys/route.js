import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Group from "@/lib/models/Group";
import GroupKey from "@/lib/models/GroupKey";
import UserKey from "@/lib/models/UserKey";
import { memberOf, isAdmin } from "@/lib/chatGuards";

// GET: fetch MY wrapped group key for the current keyVersion, plus the
// wrapper's public key (needed for the ECDH unwrap). If missing (key was
// rotated), the response says so and an admin client re-wraps via POST.
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

    const row = await GroupKey.findOne({
      groupId: group._id,
      memberId: user.id,
      keyVersion: group.keyVersion,
    }).lean();

    if (!row) {
      // Key rotation pending — an admin needs to publish a fresh wrapped key.
      return Response.json({
        success: true,
        key: null,
        keyVersion: group.keyVersion,
        needsRewrap: true,
        isAdmin: isAdmin(group, user.id),
      });
    }

    const wrapperKey = await UserKey.findOne({ clerkId: row.wrapperId }).lean();

    return Response.json({
      success: true,
      key: {
        wrappedKey: row.wrappedKey,
        iv: row.iv,
        wrapperId: row.wrapperId,
        wrapperPublicKeyJwk: wrapperKey?.publicKeyJwk || null,
        keyVersion: row.keyVersion,
      },
    });
  } catch (error) {
    console.error("Error fetching group key:", error);
    return Response.json({ error: "Failed to fetch group key" }, { status: 500 });
  }
}

// POST: publish wrapped keys after creating/rotating a group key.
// Body: { keyVersion, wrappedKeys: [{ memberId, wrappedKey, iv }] }
// Admin only. Only current members can receive keys.
export async function POST(req, { params }) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { keyVersion, wrappedKeys } = await req.json();
    if (!Array.isArray(wrappedKeys) || !keyVersion) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectDB();
    const group = await Group.findById(id).lean();
    if (!group || !memberOf(group, user.id)) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
    if (!isAdmin(group, user.id)) {
      return Response.json({ error: "Only admins can publish keys" }, { status: 403 });
    }
    if (keyVersion !== group.keyVersion) {
      return Response.json({ error: "Stale keyVersion" }, { status: 409 });
    }

    const memberIds = new Set(group.members.map((m) => m.clerkId));
    const ops = wrappedKeys
      .filter((k) => memberIds.has(k.memberId) && k.wrappedKey && k.iv)
      .map((k) => ({
        updateOne: {
          filter: { groupId: group._id, memberId: k.memberId, keyVersion },
          update: {
            $set: {
              wrapperId: user.id,
              wrappedKey: k.wrappedKey,
              iv: k.iv,
            },
          },
          upsert: true,
        },
      }));
    if (ops.length) await GroupKey.bulkWrite(ops);

    return Response.json({ success: true, published: ops.length });
  } catch (error) {
    console.error("Error publishing group keys:", error);
    return Response.json({ error: "Failed to publish keys" }, { status: 500 });
  }
}
