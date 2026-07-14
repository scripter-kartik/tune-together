import mongoose from "mongoose";

// A single row per relationship. `requesterId` sent the request to
// `recipientId`. status flips to "accepted" once the recipient confirms.
// Both ids are Clerk ids (same identifier used everywhere else in the app).
const friendshipSchema = new mongoose.Schema(
  {
    requesterId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// One relationship row per ordered pair; the API guards the reverse pair too.
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

const Friendship =
  mongoose.models.Friendship || mongoose.model("Friendship", friendshipSchema);

export default Friendship;
