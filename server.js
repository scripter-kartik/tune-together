// server.js

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
const now = () => Date.now();

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
        position: 0,     // seconds at time `at`
        at: now(),       // ms server clock corresponding to `position`
        playlist: [],
        users: new Set(),
      });
    }
    return rooms.get(roomId);
  };

  io.on("connection", (socket) => {
    // Join a room
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      const room = getRoom(roomId);
      room.users.add(socket.id);

      // Send canonical room state to the joiner
      socket.emit("room-state", {
        currentSong: room.currentSong,
        isPlaying: room.isPlaying,
        position: room.position,
        at: room.at,
        playlist: room.playlist,
        userCount: room.users.size,
      });

      // Notify everyone of user count
      io.to(roomId).emit("user-count", room.users.size);
    });

    // Chat
    socket.on("chat message", ({ roomId, msg }) => {
      socket.to(roomId).emit("chat message", msg);
    });

    // Play/Pause (authoritative)
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

    // Change song (sets position 0 unless provided)
    socket.on("change-song", ({ roomId, song, position = 0 }) => {
      const room = getRoom(roomId);
      room.currentSong = song || null;
      room.position = position || 0;
      room.at = now();
      room.isPlaying = true;

      io.to(roomId).emit("sync-song", {
        song: room.currentSong,
        isPlaying: room.isPlaying,
        position: room.position,
        at: room.at,
      });
    });

    // Seek
    socket.on("seek-time", ({ roomId, position }) => {
      const room = getRoom(roomId);
      room.position = typeof position === "number" ? position : room.position;
      room.at = now();

      socket.to(roomId).emit("sync-seek", {
        position: room.position,
        at: room.at,
      });
    });

    // Next / Prev
    socket.on("next-song", ({ roomId, song }) => {
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

    // Disconnect cleanup
    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          room.users.delete(socket.id);
          io.to(roomId).emit("user-count", room.users.size);
          if (room.users.size === 0) rooms.delete(roomId);
        }
      });
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
