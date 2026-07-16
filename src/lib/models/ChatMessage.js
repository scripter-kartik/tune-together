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
    // Legacy plaintext body. New messages are E2E-encrypted and leave this
    // null, using ciphertext/iv instead.
    message: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    // E2EE payload — AES-GCM ciphertext (base64), encrypted client-side with
    // a key derived from both users' ECDH keys. Server cannot read it.
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
    // WhatsApp-style features. Reactions are one-per-user (re-reacting
    // replaces the emoji). replyToId points at another ChatMessage in the
    // same thread — the client resolves the preview from decrypted history.
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
    // "Delete for everyone": ciphertext is wiped, a tombstone row remains.
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