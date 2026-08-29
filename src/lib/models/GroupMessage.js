import mongoose from "mongoose";




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
    
    ciphertext: {
      type: String,
      default: null,
      maxlength: 8192, 
    },
    iv: {
      type: String,
      default: null,
    },
    keyVersion: {
      type: Number,
      default: 1,
    },
    
    
    systemText: {
      type: String,
      default: null,
      maxlength: 300,
    },
    roomId: {
      type: String,
      default: null,
    },
    
    replyToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMessage",
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
  },
  {
    timestamps: true,
  }
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });

const GroupMessage =
  mongoose.models.GroupMessage || mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
