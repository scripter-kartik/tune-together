import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    songs: {
      type: Array,
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Playlist = mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);

export default Playlist;
