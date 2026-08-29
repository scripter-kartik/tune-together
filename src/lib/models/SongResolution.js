import mongoose from "mongoose";




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
