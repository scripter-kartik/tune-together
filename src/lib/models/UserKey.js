import mongoose from "mongoose";

// A user's published E2EE public key (JWK). The matching private key never
// leaves the user's device. One row per user; re-publishing replaces it
// (e.g. new device), which means old ciphertext becomes unreadable — that is
// the E2EE trade-off, same as WhatsApp without chat backup.
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
