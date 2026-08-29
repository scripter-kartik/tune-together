import { NextResponse } from "next/server";



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
