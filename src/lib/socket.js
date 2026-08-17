import { io } from "socket.io-client";

// Use explicit URL if provided (e.g., Render/Railway socket server).
// Otherwise connect to same origin (works on localhost:3000 or deployed frontend).
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: false,
      autoConnect: true,
    });
  }
  return socket;
}
