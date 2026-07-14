import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // let existing users have no handle until they claim one
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    currentlyPlaying: {
      songId: String,
      songTitle: String,
      artist: String,
      albumArt: String,
      startedAt: Date,
    },
    status: {
      type: String,
      enum: ['online', 'idle', 'offline'],
      default: 'online',
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.save();
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;