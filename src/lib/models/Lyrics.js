import mongoose from "mongoose";

// Caches lyrics (synced LRC + plain text) for a Deezer track so repeat opens
// are instant and every client in a room shows the same thing.
const lyricsSchema = new mongoose.Schema(
  {
    deezerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    syncedLyrics: {
      type: String,
      default: null,
    },
    plainLyrics: {
      type: String,
      default: null,
    },
    // Which source supplied the lyrics: "lrclib" | "youtube" | "genius".
    provider: {
      type: String,
      enum: ["lrclib", "youtube", "genius"],
      default: "lrclib",
    },
    title: String,
    artist: String,
  },
  { timestamps: true }
);

export default mongoose.models.Lyrics ||
  mongoose.model("Lyrics", lyricsSchema);
