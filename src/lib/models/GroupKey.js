import mongoose from "mongoose";

// A group's AES key, wrapped (encrypted) for one member by another member
// (`wrapperId`, usually an admin). The server cannot unwrap these — it just
// stores and hands back opaque blobs. One row per (group, member, version).
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
    // Who wrapped this key (needed for ECDH unwrap on the member's side).
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
