// Standalone Socket.IO server for TuneTogether
// Deploy separately on Render/Railway/Fly.io
// Run: npm install && npm start

const { Server } = require("socket.io");
const { createServer } = require("http");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// ---- Models ----
const GroupSchema = new mongoose.Schema({
  linkedRoomId: { type: String, unique: true },
  session: {
    currentSong: mongoose.Schema.Types.Mixed,
    queue: [mongoose.Schema.Types.Mixed],
    position: Number,
    isPlaying: Boolean,
    updatedAt: Date,
  },
});
const Group = mongoose.model("Group", GroupSchema);

// ---- In-memory state ----
const rooms = new Map();
const userSockets = new Map();
const debounceTimers = new Map();
const now = () => Date.now();

// Rate limit: 25 events / 10s per socket
const socketRateOk = (socket) => {
  const t = now();
  if (!socket._rl || t > socket._rl.resetAt) {
    socket._rl = { count: 1, resetAt: t + 10_000 };
    return true;
  }
  return ++socket._rl.count <= 25;
};

// ---- Persistence ----
function schedulePersist(roomId, room) {
  if (debounceTimers.has(roomId)) {
    clearTimeout(debounceTimers.get(roomId));
  }
  const state = {
    currentSong: room.currentSong,
    playlist: [...room.playlist],
    position: room.position,
    isPlaying: room.isPlaying,
    at: room.at,
  };
  debounceTimers.set(roomId, setTimeout(async () => {
    debounceTimers.delete(roomId);
    try {
      await Group.updateOne(
        { linkedRoomId: roomId },
        {
          $set: {
            session: {
              currentSong: state.currentSong,
              queue: state.playlist,
              position: state.position,
              isPlaying: state.isPlaying,
              updatedAt: new Date(state.at),
            }
          }
        },
        { timestamps: false }
      );
    } catch (err) {
      console.error(`Failed to persist room state for ${roomId}:`, err);
    }
  }, 1000));
}

// ---- Room hydration ----
const getRoom = async (roomId) => {
  if (!rooms.has(roomId)) {
    const newRoom = {
      currentSong: null,
      isPlaying: false,
      position: 0,
      at: now(),
      playlist: [],
      users: new Set(),
    };

    try {
      const group = await Group.findOne({ linkedRoomId: roomId }, "session").lean();
      if (group && group.session) {
        const s = group.session;
        if (s.currentSong) newRoom.currentSong = s.currentSong;
        if (s.queue) newRoom.playlist = s.queue;
        if (s.position !== undefined) newRoom.position = s.position;
        newRoom.isPlaying = false; // Always resume paused
      }
    } catch (err) {
      console.error(`Failed to hydrate room ${roomId}:`, err);
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, newRoom);
    }
  }
  return rooms.get(roomId);
};

// ---- HTTP + Socket.IO ----
const httpServer = createServer((req, res) => {
  // Health check endpoint for Render/Railway
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: rooms.size, users: userSockets.size }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", (clerkId) => {
    userSockets.set(clerkId, socket.id);
    socket.clerkId = clerkId;
    console.log(`User ${clerkId} registered with socket ${socket.id}`);
  });

  socket.on("join-room", async (roomId) => {
    socket.join(roomId);
    const room = await getRoom(roomId);
    room.users.add(socket.id);

    socket.emit("room-state", {
      currentSong: room.currentSong,
      isPlaying: room.isPlaying,
      position: room.position,
      at: room.at,
      playlist: room.playlist,
      userCount: room.users.size,
    });

    io.to(roomId).emit("user-count", room.users.size);
  });

  // DM relay (E2E encrypted - server just passes through)
  socket.on("send-dm", ({ recipientId, message, ciphertext, iv, replyToId, messageId, senderName, senderImage, type, roomId }) => {
    if (!socketRateOk(socket)) return;
    const recipientSocketId = userSockets.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive-dm", {
        senderId: socket.clerkId,
        senderName,
        senderImage,
        message,
        ciphertext,
        iv,
        replyToId,
        messageId,
        type,
        roomId,
        timestamp: new Date(),
      });
      socket.emit("dm-delivered", { recipientId, messageId });
    }
  });

  socket.on("dm-message-updated", ({ recipientId, message }) => {
    if (!socketRateOk(socket)) return;
    const recipientSocketId = userSockets.get(recipientId);
    if (recipientSocketId && message) {
      io.to(recipientSocketId).emit("dm-message-updated", {
        senderId: socket.clerkId,
        message,
      });
    }
  });

  // Group chat
  socket.on("join-group-channels", (groupIds) => {
    if (!Array.isArray(groupIds)) return;
    for (const id of groupIds.slice(0, 200)) {
      if (typeof id === "string" && /^[a-f0-9]{24}$/.test(id)) {
        socket.join(`group:${id}`);
      }
    }
  });

  socket.on("leave-group-channel", (groupId) => {
    if (typeof groupId === "string") socket.leave(`group:${groupId}`);
  });

  socket.on("group-message", ({ groupId, message }) => {
    if (!socketRateOk(socket)) return;
    if (typeof groupId !== "string" || !message) return;
    if (!socket.rooms.has(`group:${groupId}`)) return;
    socket.to(`group:${groupId}`).emit("group-message", { groupId, message });
  });

  socket.on("group-message-updated", ({ groupId, message }) => {
    if (!socketRateOk(socket)) return;
    if (typeof groupId !== "string" || !message) return;
    if (!socket.rooms.has(`group:${groupId}`)) return;
    socket.to(`group:${groupId}`).emit("group-message-updated", { groupId, message });
  });

  socket.on("group-updated", ({ groupId, type }) => {
    if (typeof groupId !== "string") return;
    io.to(`group:${groupId}`).emit("group-updated", {
      groupId,
      type: type || "update",
      from: socket.clerkId,
    });
  });

  socket.on("group-typing", ({ groupId, isTyping, senderName }) => {
    if (typeof groupId !== "string") return;
    if (!socket.rooms.has(`group:${groupId}`)) return;
    socket.to(`group:${groupId}`).emit("group-typing", {
      groupId,
      senderId: socket.clerkId,
      senderName,
      isTyping,
    });
  });

  socket.on("mark-read", ({ senderId }) => {
    const senderSocketId = userSockets.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-read", { readerId: socket.clerkId });
    }
  });

  socket.on("typing", ({ recipientId, isTyping }) => {
    const recipientSocketId = userSockets.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", { senderId: socket.clerkId, isTyping });
    }
  });

  socket.on("friend-notify", ({ toClerkId, type }) => {
    const targetSocketId = userSockets.get(toClerkId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("friend-update", { from: socket.clerkId, type: type || "update" });
    }
  });

  // ---- Queue / Playback ----
  socket.on("toggle-play", async ({ roomId, isPlaying, position }) => {
    const room = await getRoom(roomId);
    room.isPlaying = !!isPlaying;
    room.position = typeof position === "number" ? position : room.position;
    room.at = now();

    socket.to(roomId).emit("sync-play", {
      isPlaying: room.isPlaying,
      position: room.position,
      at: room.at,
    });
    schedulePersist(roomId, room);
  });

  socket.on("change-song", async ({ roomId, song, position = 0 }) => {
    const room = await getRoom(roomId);
    room.currentSong = song || null;
    room.position = position || 0;
    room.at = now();
    room.isPlaying = true;

    if (song) {
      const before = room.playlist.length;
      room.playlist = room.playlist.filter((s) => s.id !== song.id);
      if (room.playlist.length !== before) {
        io.to(roomId).emit("sync-queue", { playlist: room.playlist });
      }
    }

    io.to(roomId).emit("sync-song", {
      song: room.currentSong,
      isPlaying: room.isPlaying,
      position: room.position,
      at: room.at,
    });
    schedulePersist(roomId, room);
  });

  socket.on("add-to-queue", async ({ roomId, song }) => {
    if (!song) return;
    const room = await getRoom(roomId);

    if (!song._uniqueKey) {
      song._uniqueKey = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    room.playlist.push(song);
    io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    schedulePersist(roomId, room);
  });

  socket.on("remove-from-queue", async ({ roomId, songId }) => {
    const room = await getRoom(roomId);
    const index = room.playlist.findIndex((s) => s._uniqueKey === songId || s.id === songId);
    if (index !== -1) {
      room.playlist.splice(index, 1);
    }
    io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    schedulePersist(roomId, room);
  });

  socket.on("clear-queue", async ({ roomId }) => {
    const room = await getRoom(roomId);
    room.playlist = [];
    io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    schedulePersist(roomId, room);
  });

  socket.on("reorder-queue", async ({ roomId, fromIndex, toIndex }) => {
    const room = await getRoom(roomId);
    if (
      typeof fromIndex !== "number" ||
      typeof toIndex !== "number" ||
      fromIndex < 0 || toIndex < 0 ||
      fromIndex >= room.playlist.length ||
      toIndex >= room.playlist.length
    ) return;
    const [moved] = room.playlist.splice(fromIndex, 1);
    room.playlist.splice(toIndex, 0, moved);
    io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    schedulePersist(roomId, room);
  });

  socket.on("seek-time", async ({ roomId, position }) => {
    const room = await getRoom(roomId);
    room.position = typeof position === "number" ? position : room.position;
    room.at = now();

    socket.to(roomId).emit("sync-seek", {
      position: room.position,
      at: room.at,
    });
    schedulePersist(roomId, room);
  });

  socket.on("next-song", async ({ roomId, song }) => {
    const room = await getRoom(roomId);

    let nextSong = song || null;
    if (room.playlist.length > 0) {
      nextSong = room.playlist.shift();
      io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    }

    room.currentSong = nextSong || null;
    room.position = 0;
    room.at = now();
    room.isPlaying = true;

    io.to(roomId).emit("sync-song", {
      song: room.currentSong,
      isPlaying: true,
      position: 0,
      at: room.at,
    });
    schedulePersist(roomId, room);
  });

  socket.on("prev-song", async ({ roomId, song }) => {
    const room = await getRoom(roomId);
    room.currentSong = song || null;
    room.position = 0;
    room.at = now();
    room.isPlaying = true;

    io.to(roomId).emit("sync-song", {
      song: room.currentSong,
      isPlaying: true,
      position: 0,
      at: room.at,
    });
    schedulePersist(roomId, room);
  });

  socket.on("send-reaction", ({ roomId, reaction, user }) => {
    io.to(roomId).emit("room-reaction", {
      id: Math.random().toString(36).substr(2, 9),
      reaction,
      user,
      timestamp: Date.now()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (socket.clerkId) {
      userSockets.delete(socket.clerkId);
    }

    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        io.to(roomId).emit("user-count", room.users.size);
        if (room.users.size === 0) rooms.delete(roomId);
      }
    });
  });

  socket.on("get-public-rooms", () => {
    const publicRooms = [];
    rooms.forEach((room, roomId) => {
      if (room.users.size > 0 && room.currentSong) {
        publicRooms.push({
          roomId,
          userCount: room.users.size,
          currentSong: room.currentSong
        });
      }
    });
    publicRooms.sort((a, b) => b.userCount - a.userCount);
    socket.emit("public-rooms", publicRooms.slice(0, 10));
  });
});

// ---- Connect to MongoDB, then start server ----
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    httpServer.listen(PORT, () => {
      console.log(`> Socket.IO server running on port ${PORT}`);
      console.log(`> Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  await mongoose.disconnect();
  httpServer.close(() => process.exit(0));
});