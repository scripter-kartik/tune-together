// ============================================
// FILE 2: src/lib/models/ChatMessage.js (NEW)
// ============================================

import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String, // Clerk user ID
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderImage: {
      type: String,
    },
    recipientId: {
      type: String, // Clerk user ID
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
chatMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;