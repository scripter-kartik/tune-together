// ============================================
// FILE 1: src/lib/models/User.js (UPDATED)
// ============================================

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
    email: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
    },
    // Track user activity
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // Track what they're currently playing
    currentlyPlaying: {
      songId: String,
      songTitle: String,
      artist: String,
      albumArt: String,
      startedAt: Date,
    },
    // User status
    status: {
      type: String,
      enum: ['online', 'idle', 'offline'],
      default: 'online',
    },
    // NEW: Socket ID for real-time chat
    socketId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastActive whenever user does something
userSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.save();
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;