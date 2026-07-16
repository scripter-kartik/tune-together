//server.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

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

app.prepare().then(() => {
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

  const getRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        currentSong: null,
        isPlaying: false,
        position: 0,
        at: now(),
        playlist: [],
        users: new Set(),
      });
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

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      const room = getRoom(roomId);
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

    socket.on("chat message", ({ roomId, msg }) => {
      socket.to(roomId).emit("chat message", msg);
    });

    // DMs are E2E-encrypted: `ciphertext`/`iv` are opaque blobs the server
    // just relays. Legacy plaintext `message` still passes through for old
    // clients. Persistence happens via /api/chat/send in parallel.
    socket.on("send-dm", ({ recipientId, message, ciphertext, iv, senderName, senderImage }) => {
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
          timestamp: new Date(),
        });

        socket.emit("dm-sent", {
          recipientId,
          message,
          ciphertext,
          iv,
          timestamp: new Date(),
        });
      } else {
        socket.emit("dm-error", {
          recipientId,
          error: "User is offline",
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

    socket.on("toggle-play", ({ roomId, isPlaying, position }) => {
      const room = getRoom(roomId);
      room.isPlaying = !!isPlaying;
      room.position = typeof position === "number" ? position : room.position;
      room.at = now();

      socket.to(roomId).emit("sync-play", {
        isPlaying: room.isPlaying,
        position: room.position,
        at: room.at,
      });
    });

    socket.on("change-song", ({ roomId, song, position = 0 }) => {
      const room = getRoom(roomId);
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
    });

    socket.on("add-to-queue", ({ roomId, song }) => {
      if (!song) return;
      const room = getRoom(roomId);

      if (!room.playlist.some((s) => s.id === song.id)) {
        room.playlist.push(song);
      }
      io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    });

    socket.on("remove-from-queue", ({ roomId, songId }) => {
      const room = getRoom(roomId);
      room.playlist = room.playlist.filter((s) => s.id !== songId);
      io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    });

    socket.on("clear-queue", ({ roomId }) => {
      const room = getRoom(roomId);
      room.playlist = [];
      io.to(roomId).emit("sync-queue", { playlist: room.playlist });
    });

    socket.on("seek-time", ({ roomId, position }) => {
      const room = getRoom(roomId);
      room.position = typeof position === "number" ? position : room.position;
      room.at = now();

      socket.to(roomId).emit("sync-seek", {
        position: room.position,
        at: room.at,
      });
    });

    socket.on("next-song", ({ roomId, song }) => {
      const room = getRoom(roomId);

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
    });

    socket.on("prev-song", ({ roomId, song }) => {
      const room = getRoom(roomId);
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