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
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ "members.clerkId": 1, updatedAt: -1 });

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;
