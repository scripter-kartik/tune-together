import mongoose from "mongoose";

const roomMessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
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
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

roomMessageSchema.index({ roomId: 1, createdAt: -1 });

const RoomMessage = mongoose.models.RoomMessage || mongoose.model("RoomMessage", roomMessageSchema);

export default RoomMessage;
