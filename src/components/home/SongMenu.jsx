"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Check, Play, Music2, ListMusic, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { toggleLike, useIsLiked } from "@/lib/library";
import { useUser } from "@clerk/nextjs";

// Right-click / "More options" menu for a song: play, queue, add to playlist,
// go to artist.
export default function SongMenu({ song, position, onClose, onPlay, onQueue, onOpenArtist }) {
  const { isSignedIn } = useUser();
  const liked = useIsLiked(song);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [addedToId, setAddedToId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/playlists")
        .then(r => r.json())
        .then(d => { if (d.success) setPlaylists(d.playlists); });
    }
  }, [isSignedIn]);

  
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const addToPlaylist = async (playlistId) => {
    setAddedToId(playlistId);
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, song, action: "add" }),
      });
      const data = await res.json();
      if (data.success) window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
    } catch {}
    setTimeout(() => { setAddedToId(null); onClose(); }, 800);
  };

  
  const createAndAdd = async () => {
    setIsCreatingNew(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Playlist", song }),
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
        onClose();
      }
    } catch {}
    setIsCreatingNew(false);
  };

  
  const style = {
    position: "fixed",
    top: position.y,
    left: position.x,
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-[#282828] border border-[var(--tt-border)] rounded-lg shadow-2xl shadow-black/60 py-1 min-w-[200px] text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        onClick={() => { onPlay(song); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-white transition-colors hover:bg-white/10 text-left"
      >
        <Play className="w-4 h-4 fill-current" /> Play now
      </button>
      <button
        onClick={() => { onQueue(song); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-white transition-colors hover:bg-white/10 text-left"
      >
        <Plus className="w-4 h-4" /> Add to queue
      </button>
      <button
        onClick={() => {
          const now = toggleLike(song);
          toast(now ? "Added to Liked Songs" : "Removed from Liked Songs", {
            id: "tt-like",
            duration: 2000,
            style: { background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px" },
          });
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-white transition-colors hover:bg-white/10 text-left"
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-green-400 text-green-400" : ""}`} />
        {liked ? "Remove from your Liked Songs" : "Save to your Liked Songs"}
      </button>

      {isSignedIn && (
        <>
          <div className="h-px bg-[var(--tt-divider)] my-1" />
          <button
            onClick={() => setShowPlaylists(!showPlaylists)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-white transition-colors hover:bg-white/10 text-left"
          >
            <ListMusic className="w-4 h-4" />
            Add to playlist
            <span className="ml-auto text-neutral-400">{showPlaylists ? "▲" : "▶"}</span>
          </button>

          {showPlaylists && (
            <div className="border-t border-[var(--tt-border)] bg-[#1a1a1a]">
              <button
                onClick={createAndAdd}
                disabled={isCreatingNew}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-green-400 font-semibold transition-colors hover:bg-white/10 hover:text-green-300 text-left disabled:opacity-60"
              >
                {isCreatingNew ? (
                  <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                New playlist
              </button>
              <div className="h-px bg-[var(--tt-divider)] my-1" />
              {playlists.length === 0 ? (
                <p className="px-4 py-2 text-neutral-500 text-xs">No playlists yet.</p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl._id}
                    onClick={() => addToPlaylist(pl._id)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-neutral-300 transition-colors hover:text-white hover:bg-white/10 text-left"
                  >
                    <span className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                      {pl.image ? (
                        <img referrerPolicy="no-referrer" src={pl.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500/70 to-indigo-500/70">
                          <Music2 className="w-4 h-4 text-white/80" />
                        </span>
                      )}
                    </span>
                    <span className="truncate flex-1">{pl.name}</span>
                    {addedToId === pl._id && <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {song.artist?.id && (
        <>
          <div className="h-px bg-[var(--tt-divider)] my-1" />
          <button
            onClick={() => { onOpenArtist?.(song.artist.id); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 transition-colors hover:text-white hover:bg-white/10 text-left"
          >
            <Music2 className="w-4 h-4" /> Go to artist
          </button>
        </>
      )}
    </div>
  );
}
