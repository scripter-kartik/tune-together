import mongoose from "mongoose";

// A named group chat ("Discord for music" — one text thread per group, and an
// optional linked listening room). Members are Clerk ids, same as everywhere.
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    icon: {
      type: String,
      default: null, // emoji or image URL
    },
    createdBy: {
      type: String,
      required: true,
    },
    members: [
      {
        clerkId: { type: String, required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Bumped every time the E2EE group key is rotated (member removed/left).
    keyVersion: {
      type: Number,
      default: 1,
    },
    // Active listening session started from this group, if any.
    linkedRoomId: {
      type: String,
      default: null,
    },
    // Durable, non-authoritative snapshot of the linked room's playback state.
    // The live source of truth is the in-memory room in server.js; this is
    // written on change so a session survives everyone leaving (and server
    // restarts) and members can "Resume listening" where the group left off.
    // Its own `updatedAt` is nested on purpose — the group's top-level
    // updatedAt drives chat-list ordering and must NOT move on every play tick.
    session: {
      currentSong: { type: mongoose.Schema.Types.Mixed, default: null },
      queue: { type: [mongoose.Schema.Types.Mixed], default: [] },
      position: { type: Number, default: 0 }, // ms into currentSong at snapshot
      isPlaying: { type: Boolean, default: false },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ "members.clerkId": 1, updatedAt: -1 });
// server.js resolves group rooms by their linked room id on join / snapshot.
groupSchema.index({ linkedRoomId: 1 });

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;
