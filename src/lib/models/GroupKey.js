import mongoose from "mongoose";




const groupKeySchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    memberId: {
      type: String,
      required: true,
    },
    keyVersion: {
      type: Number,
      required: true,
    },
    
    wrapperId: {
      type: String,
      required: true,
    },
    wrappedKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

groupKeySchema.index({ groupId: 1, memberId: 1, keyVersion: -1 }, { unique: true });

const GroupKey = mongoose.models.GroupKey || mongoose.model("GroupKey", groupKeySchema);

export default GroupKey;
