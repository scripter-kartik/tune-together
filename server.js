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

    
    socket.on("send-dm", ({ recipientId, message, senderName, senderImage }) => {
      const recipientSocketId = userSockets.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive-dm", {
          senderId: socket.clerkId,
          senderName,
          senderImage,
          message,
          timestamp: new Date(),
        });
        
        socket.emit("dm-sent", {
          recipientId,
          message,
          timestamp: new Date(),
        });
      } else {
        socket.emit("dm-error", {
          recipientId,
          error: "User is offline",
        });
      }
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

      io.to(roomId).emit("sync-song", {
        song: room.currentSong,
        isPlaying: room.isPlaying,
        position: room.position,
        at: room.at,
      });
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