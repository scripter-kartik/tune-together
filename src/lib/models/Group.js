import mongoose from "mongoose";



const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    icon: {
      type: String,
      default: null, 
    },
    createdBy: {
      type: String,
      required: true,
    },
    members: [
      {
        clerkId: { type: String, required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    
    keyVersion: {
      type: Number,
      default: 1,
    },
    
    linkedRoomId: {
      type: String,
      default: null,
    },
    
    
    
    
    
    
    session: {
      currentSong: { type: mongoose.Schema.Types.Mixed, default: null },
      queue: { type: [mongoose.Schema.Types.Mixed], default: [] },
      position: { type: Number, default: 0 }, 
      isPlaying: { type: Boolean, default: false },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ "members.clerkId": 1, updatedAt: -1 });

groupSchema.index({ linkedRoomId: 1 });

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;
