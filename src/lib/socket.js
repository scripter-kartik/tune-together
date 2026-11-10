import { io } from "socket.io-client";



function resolveSocketUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
  }
  // `npm run dev` (server.js) serves Socket.IO on the same origin, so local
  // work talks to the local server instead of the deployed one (which may be
  // asleep and runs older code). Set NEXT_PUBLIC_USE_REMOTE_SOCKET=1 to opt out.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (isLocal && process.env.NEXT_PUBLIC_USE_REMOTE_SOCKET !== "1") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
}

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: false,
      autoConnect: true,
    });
  }
  return socket;
}
