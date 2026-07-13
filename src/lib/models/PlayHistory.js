import mongoose from "mongoose";

const playHistorySchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    songId: {
      type: String,
      required: true,
    },
    title: String,
    artistId: String,
    artistName: {
      type: String,
      default: "Unknown Artist",
    },
    albumArt: String,
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

playHistorySchema.index({ clerkId: 1, playedAt: -1 });

const PlayHistory =
  mongoose.models.PlayHistory || mongoose.model("PlayHistory", playHistorySchema);

export default PlayHistory;
