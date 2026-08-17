import { NextResponse } from "next/server";

// Socket.IO is handled by a separate standalone server (socket-server/).
// This route is just a liveness probe for the Next.js frontend.
export const dynamic = "force-dynamic";

export async function GET() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return NextResponse.json({
    message: "Frontend is running. Socket.IO connects to: " + socketUrl,
    socketUrl,
    status: "active",
  });
}
