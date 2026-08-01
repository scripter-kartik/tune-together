import mongoose from "mongoose";

// A scheduled "listening party" — a future room that friends plan to join.
// `scheduledAt` is when the party is meant to start; the host (or any
// invitee) can kick it off early, which creates a live room.
const listeningPartySchema = new mongoose.Schema(
  {
    hostId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    inviteeIds: {
      type: [String],
      default: [],
      index: true,
    },
    // Set once the party has been started (a room was created).
    roomId: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ListeningParty =
  mongoose.models.ListeningParty ||
  mongoose.model("ListeningParty", listeningPartySchema);

export default ListeningParty;
