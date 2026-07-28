import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Playlist from "@/lib/models/Playlist";

export async function GET(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const playlists = await Playlist.find({ userId: user.id }).sort({ createdAt: -1 });

    return Response.json({ success: true, playlists });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return Response.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { name, song } = await req.json();
    if (!name && !song) return Response.json({ error: "Missing parameters" }, { status: 400 });

    await connectDB();

    const newPlaylist = await Playlist.create({
      userId: user.id,
      name: name || "New Playlist",
      songs: song ? [song] : [],
      image: song ? (song.album?.cover_medium || song.album?.cover_small || "") : "",
    });

    return Response.json({ success: true, playlist: newPlaylist });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return Response.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { playlistId, song, action } = await req.json();
    if (!playlistId || !song || !action) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();
    const playlist = await Playlist.findOne({ _id: playlistId, userId: user.id });
    if (!playlist) return Response.json({ error: "Not found" }, { status: 404 });

    if (action === "add") {
      // Prevent duplicates
      if (!playlist.songs.find((s) => String(s.id) === String(song.id))) {
        playlist.songs.push(song);
        playlist.markModified("songs");
        if (!playlist.image) {
          playlist.image = song.album?.cover_medium || song.album?.cover_small || "";
        }
      }
    } else if (action === "remove") {
      playlist.songs = playlist.songs.filter((s) => String(s.id) !== String(song.id));
      playlist.markModified("songs");
    }

    await playlist.save();
    return Response.json({ success: true, playlist });
  } catch (error) {
    console.error("Error updating playlist:", error);
    return Response.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return Response.json({ error: "Missing playlist id" }, { status: 400 });

    await connectDB();
    await Playlist.findOneAndDelete({ _id: id, userId: user.id });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return Response.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
