import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderImage: {
      type: String,
      default: null,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    
    
    message: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    
    
    ciphertext: {
      type: String,
      default: null,
      maxlength: 8192,
    },
    iv: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    
    
    
    replyToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    reactions: [
      {
        _id: false,
        emoji: { type: String, maxlength: 16 },
        userId: { type: String },
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedBySender: {
      type: Boolean,
      default: false,
    },
    deletedByRecipient: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["text", "session-invite"],
      default: "text",
    },
    
    
    roomId: {
      type: String,
      default: null,
      maxlength: 256,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
chatMessageSchema.index({ recipientId: 1, senderId: 1, createdAt: -1 });

chatMessageSchema.index({ recipientId: 1, read: 1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
