import mongoose from "mongoose";



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
