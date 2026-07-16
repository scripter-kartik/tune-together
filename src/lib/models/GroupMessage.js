import mongoose from "mongoose";

// A message in a group chat. E2E-encrypted: the server only ever stores
// ciphertext + iv; decryption happens client-side with the group key for
// `keyVersion`. System/session messages are plaintext (no user content).
const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderImage: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["text", "system", "session-invite"],
      default: "text",
    },
    // E2EE payload (type === "text")
    ciphertext: {
      type: String,
      default: null,
      maxlength: 8192, // ~2000 chars of plaintext after AES-GCM + base64
    },
    iv: {
      type: String,
      default: null,
    },
    keyVersion: {
      type: Number,
      default: 1,
    },
    // Plaintext payload for system messages ("X added Y") and session invites
    // (roomId) — never user-typed content.
    systemText: {
      type: String,
      default: null,
      maxlength: 300,
    },
    roomId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });

const GroupMessage =
  mongoose.models.GroupMessage || mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
