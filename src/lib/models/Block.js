import mongoose from "mongoose";

// `blockerId` has blocked `blockedId`: no DMs in either direction, and the
// blocked user cannot add the blocker to groups. Both are Clerk ids.
const blockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: String,
      required: true,
      index: true,
    },
    blockedId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const Block = mongoose.models.Block || mongoose.model("Block", blockSchema);

export default Block;

/** True if either user has blocked the other. */
export async function isBlockedEitherWay(userA, userB) {
  const row = await Block.findOne({
    $or: [
      { blockerId: userA, blockedId: userB },
      { blockerId: userB, blockedId: userA },
    ],
  }).lean();
  return !!row;
}
