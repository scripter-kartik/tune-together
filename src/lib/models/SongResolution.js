import mongoose from "mongoose";

// Caches the mapping from a Deezer track id to a YouTube video id so that
// every client in a room resolves the SAME full-length source (keeps playback
// in sync) and repeat lookups avoid re-hitting YouTube.
const songResolutionSchema = new mongoose.Schema(
  {
    deezerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    youtubeId: {
      type: String,
      default: null,
    },
    title: String,
    artist: String,
  },
  { timestamps: true }
);

export default mongoose.models.SongResolution ||
  mongoose.model("SongResolution", songResolutionSchema);
