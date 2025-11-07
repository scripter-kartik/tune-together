// src/app/api/socket/route.js

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Socket.IO server is running on the same port as Next.js",
    status: "active",
  });
}
