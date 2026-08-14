import { NextResponse } from "next/server";

// Socket.IO is handled by the custom server.js on this same port; this route
// is just a liveness probe. Mark it dynamic so Next.js doesn't try to
// statically prerender it during `next build` (which fails the build).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    message: "Socket.IO server is running on the same port as Next.js",
    status: "active",
  });
}
