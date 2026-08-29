import mongoose from "mongoose";





const userKeySchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicKeyJwk: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const UserKey = mongoose.models.UserKey || mongoose.model("UserKey", userKeySchema);

export default UserKey;
