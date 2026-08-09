import { connectDB } from "@/lib/db";
import Playlist from "@/lib/models/Playlist";
import { hydratePlaylists } from "@/lib/playlistHydrate";

// GET /api/playlists/[id] — fetch a single playlist by id.
//
// Public read: a playlist is shareable/linkable (e.g. from a user profile), so
// anyone can view it — the same way Spotify lets anyone open a playlist URL.
// All mutation is still gated by auth + ownership in the main route. PlaylistView
// uses this to always render fresh data instead of whatever object the sidebar
// happened to pass in, so add/remove/rename show up immediately.
export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return Response.json({ error: "Invalid playlist id" }, { status: 400 });
    }

    await connectDB();
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return Response.json({ error: "Playlist not found" }, { status: 404 });
    }

    const [hydrated] = await hydratePlaylists([playlist]);
    return Response.json({ success: true, playlist: hydrated });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return Response.json({ error: "Failed to fetch playlist" }, { status: 500 });
  }
}
