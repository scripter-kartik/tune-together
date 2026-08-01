import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import ListeningParty from "@/lib/models/ListeningParty";
import User from "@/lib/models/User";

// Hydrate a list of parties with host + invitee display info.
async function hydrateParties(parties) {
  const ids = new Set();
  parties.forEach((p) => {
    ids.add(p.hostId);
    (p.inviteeIds || []).forEach((c) => ids.add(c));
  });
  const users = await User.find({ clerkId: { $in: [...ids] } }).lean();
  const byId = new Map(users.map((u) => [u.clerkId, u]));
  return parties.map((p) => ({
    ...p,
    host: byId.get(p.hostId) || null,
    invitees: (p.inviteeIds || []).map((c) => byId.get(c)).filter(Boolean),
  }));
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const parties = await ListeningParty.find({
      $or: [{ hostId: user.id }, { inviteeIds: user.id }],
    }).sort({ scheduledAt: 1 });

    const hydrated = await hydrateParties(parties);
    return Response.json({ success: true, parties: hydrated });
  } catch (error) {
    console.error("Error fetching parties:", error);
    return Response.json({ error: "Failed to fetch parties" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description, scheduledAt, inviteeIds } = await req.json();
    if (!name) return Response.json({ error: "Missing name" }, { status: 400 });

    await connectDB();

    const party = await ListeningParty.create({
      hostId: user.id,
      name,
      description: description || "",
      scheduledAt: scheduledAt || new Date(),
      inviteeIds: inviteeIds || [],
    });

    return Response.json({ success: true, party });
  } catch (error) {
    console.error("Error creating party:", error);
    return Response.json({ error: "Failed to create party" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { partyId, action } = await req.json();
    if (!partyId || !action) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();
    const party = await ListeningParty.findOne({
      _id: partyId,
      $or: [{ hostId: user.id }, { inviteeIds: user.id }],
    });
    if (!party) return Response.json({ error: "Not found" }, { status: 404 });

    if (action === "start") {
      // Start the party now — generate a roomId.
      const roomId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `party-${Date.now().toString(36)}`;
      party.roomId = roomId;
      party.startedAt = new Date();
      await party.save();
      return Response.json({ success: true, party, roomId });
    }

    if (action === "cancel" && String(party.hostId) === String(user.id)) {
      await ListeningParty.deleteOne({ _id: party._id });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action or no permission" }, { status: 403 });
  } catch (error) {
    console.error("Error updating party:", error);
    return Response.json({ error: "Failed to update party" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "Missing party id" }, { status: 400 });

    await connectDB();
    await ListeningParty.findOneAndDelete({ _id: id, hostId: user.id });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting party:", error);
    return Response.json({ error: "Failed to delete party" }, { status: 500 });
  }
}
