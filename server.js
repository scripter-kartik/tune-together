//server.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();
const userSockets = new Map();
const now = () => Date.now();

// Per-socket message rate limit: 25 events / 10s. The API layer enforces the
// real limits; this just stops a rogue client from flooding the relay.
const socketRateOk = (socket) => {
  const t = now();
  if (!socket._rl || t > socket._rl.resetAt) {
    socket._rl = { count: 1, resetAt: t + 10_000 };
    return true;
  }
  return ++socket._rl.count <= 25;
};

let Group, connectDB;

const debounceTimers = new Map();
function schedulePersist(roomId, room) {
  if (!Group) return;
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

app.prepare().then(() => {
  connectDB = require("./src/lib/db.js").connectDB;
  Group = require("./src/lib/models/Group.js").default;
  connectDB().catch(console.error);

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

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

      if (Group) {
        try {
          const group = await Group.findOne({ linkedRoomId: roomId }, "session").lean();
          if (group && group.session) {
            const s = group.session;
            if (s.currentSong) newRoom.currentSong = s.currentSong;
            if (s.queue) newRoom.playlist = s.queue;
            if (s.position !== undefined) newRoom.position = s.position;
            // Always resume paused with a fresh `at`: clients compute the live
            // position as position + (now - at), so a stale snapshot timestamp
            // would seek hours past the end of the song.
            newRoom.isPlaying = false;
          }
        } catch (err) {
          console.error(`Failed to hydrate room ${roomId}:`, err);
        }
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, newRoom);
      }
    }
    return rooms.get(roomId);
  };

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

    // DMs are E2E-encrypted: `ciphertext`/`iv` are opaque blobs the server
    // just relays. Legacy plaintext `message` still passes through for old
    // clients. Persistence happens via /api/chat/send in parallel.
    socket.on("send-dm", ({
      recipientId,
      message,
      ciphertext,
      iv,
      replyToId,
      messageId,
      senderName,
      senderImage,
      type,
      roomId,
    }) => {
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

        // Single tick → double tick: tell the sender it reached a device.
        socket.emit("dm-delivered", { recipientId, messageId });
      }
      // Recipient offline is NOT an error — the message is already persisted
      // and will be delivered from history when they come online.
    });

    // Relay a reaction/edit/delete on a DM to the other participant. The row
    // was already updated via /api/chat/message/[id]; this is display-only.
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

    // ── Group chat ─────────────────────────────────────────────────────────
    // Clients join a socket channel per group after fetching /api/groups, so
    // messages/updates reach every online member instantly.
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

    // Relay an already-persisted group message (ciphertext passthrough — the
    // server can't read it). Sender emits after /api/groups/[id]/messages OKs.
    socket.on("group-message", ({ groupId, message }) => {
      if (!socketRateOk(socket)) return;
      if (typeof groupId !== "string" || !message) return;
      if (!socket.rooms.has(`group:${groupId}`)) return; // members only
      socket.to(`group:${groupId}`).emit("group-message", { groupId, message });
    });

    // Relay an already-persisted reaction/edit/delete on a group message.
    socket.on("group-message-updated", ({ groupId, message }) => {
      if (!socketRateOk(socket)) return;
      if (typeof groupId !== "string" || !message) return;
      if (!socket.rooms.has(`group:${groupId}`)) return; // members only
      socket.to(`group:${groupId}`).emit("group-message-updated", { groupId, message });
    });

    // Membership / rename / key-rotation changed — tell members to refetch.
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
        io.to(senderSocketId).emit("messages-read", {
          readerId: socket.clerkId,
        });
      }
    });

    socket.on("typing", ({ recipientId, isTyping }) => {
      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("user-typing", {
          senderId: socket.clerkId,
          isTyping,
        });
      }
    });

    // Live friend updates: after a request/accept/remove is persisted via the
    // API, the acting client pings the other user so their friends list
    // refreshes instantly (they fall back to polling if currently offline).
    socket.on("friend-notify", ({ toClerkId, type }) => {
      const targetSocketId = userSockets.get(toClerkId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("friend-update", {
          from: socket.clerkId,
          type: type || "update",
        });
      }
    });

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
      // Broadcast reaction to everyone in the room (including sender if desired, but we can exclude sender with socket.to)
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
      // Sort by user count descending
      publicRooms.sort((a, b) => b.userCount - a.userCount);
      socket.emit("public-rooms", publicRooms.slice(0, 10)); // return top 10
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running`);
    });
});
