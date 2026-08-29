import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import UserKey from "@/lib/models/UserKey";


export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicKeyJwk } = await req.json();
    if (
      !publicKeyJwk ||
      publicKeyJwk.kty !== "EC" ||
      publicKeyJwk.crv !== "P-256" ||
      !publicKeyJwk.x ||
      !publicKeyJwk.y
    ) {
      return Response.json({ error: "Invalid public key" }, { status: 400 });
    }

    await connectDB();
    await UserKey.findOneAndUpdate(
      { clerkId: user.id },
      { clerkId: user.id, publicKeyJwk: { kty: "EC", crv: "P-256", x: publicKeyJwk.x, y: publicKeyJwk.y } },
      { upsert: true }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error publishing key:", error);
    return Response.json({ error: "Failed to publish key" }, { status: 500 });
  }
}


export async function GET(req) {
  try {
    const user = await currentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ids = (new URL(req.url).searchParams.get("ids") || "")
      .split(",")
      .filter(Boolean)
      .slice(0, 100);
    if (!ids.length) {
      return Response.json({ error: "ids required" }, { status: 400 });
    }

    await connectDB();
    const rows = await UserKey.find({ clerkId: { $in: ids } }).lean();
    const keys = {};
    for (const r of rows) keys[r.clerkId] = r.publicKeyJwk;

    return Response.json({ success: true, keys });
  } catch (error) {
    console.error("Error fetching keys:", error);
    return Response.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}
