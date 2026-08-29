import mongoose from "mongoose";



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

export async function isBlockedEitherWay(userA, userB) {
  const row = await Block.findOne({
    $or: [
      { blockerId: userA, blockedId: userB },
      { blockerId: userB, blockedId: userA },
    ],
  }).lean();
  return !!row;
}
