import mongoose from "mongoose";




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


friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

const Friendship =
  mongoose.models.Friendship || mongoose.model("Friendship", friendshipSchema);

export default Friendship;
