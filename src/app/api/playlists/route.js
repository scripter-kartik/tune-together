import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import Playlist from "@/lib/models/Playlist";
import { hydratePlaylists } from "@/lib/playlistHydrate";

export async function GET(req) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    
    const playlists = await Playlist.find({
      $or: [{ userId: user.id }, { collaborators: user.id }],
    }).sort({ createdAt: -1 });

    const hydrated = await hydratePlaylists(playlists);
    return Response.json({ success: true, playlists: hydrated });
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

    const { playlistId, song, action, name } = await req.json();
    if (!playlistId || !action) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();
    const playlist = await Playlist.findOne({
      _id: playlistId,
      $or: [{ userId: user.id }, { collaborators: user.id }],
    });
    if (!playlist) return Response.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(playlist.userId) === String(user.id);
    const isCollaborator = (playlist.collaborators || []).some(
      (c) => String(c) === String(user.id)
    );
    const canEditSongs = isOwner || isCollaborator;

    if (!canEditSongs) {
      return Response.json({ error: "No permission" }, { status: 403 });
    }

    if (action === "add") {
      
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
    } else if (action === "rename" && isOwner) {
      
      if (!name || !name.trim()) return Response.json({ error: "Missing name" }, { status: 400 });
      playlist.name = name.trim();
    } else if (action === "addCollaborator" && isOwner) {
      const collaboratorId = song; 
      if (!collaboratorId) return Response.json({ error: "Missing collaborator" }, { status: 400 });
      const exists = await User.findOne({ clerkId: collaboratorId }).lean();
      if (!exists) return Response.json({ error: "User not found" }, { status: 404 });
      if (!playlist.collaborators.includes(collaboratorId)) {
        playlist.collaborators.push(collaboratorId);
        playlist.isCollaborative = true;
      }
    } else if (action === "removeCollaborator" && isOwner) {
      const collaboratorId = song;
      if (!collaboratorId) return Response.json({ error: "Missing collaborator" }, { status: 400 });
      playlist.collaborators = (playlist.collaborators || []).filter(
        (c) => String(c) !== String(collaboratorId)
      );
      playlist.isCollaborative = playlist.collaborators.length > 0;
    } else {
      return Response.json({ error: "Invalid action or no permission" }, { status: 403 });
    }

    await playlist.save();
    const [hydrated] = await hydratePlaylists([playlist]);
    return Response.json({ success: true, playlist: hydrated });
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
