'use client'

import { useState, useEffect, useRef } from "react";
import { Plus, Check, Play, Pause, Music2, ListMusic, MoreVertical } from "lucide-react";
import SongDetailsModal from "./SongDetailsModal";
import { resolveCover, coverError } from "../lib/coverPlaceholder";
import { useUser } from "@clerk/nextjs";

function Equalizer() {
  return (
    <div className="flex gap-0.5 items-end h-3.5">
      <span className="w-0.5 bg-green-400 animate-pulse h-1.5" />
      <span className="w-0.5 bg-green-400 animate-pulse h-3" style={{ animationDelay: "0.2s" }} />
      <span className="w-0.5 bg-green-400 animate-pulse h-2" style={{ animationDelay: "0.4s" }} />
      <span className="w-0.5 bg-green-400 animate-pulse h-3.5" style={{ animationDelay: "0.6s" }} />
    </div>
  );
}

function ContextMenu({ song, position, onClose, onPlay, onQueue, onOpenArtist }) {
  const { isSignedIn } = useUser();
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

export default function MusicCards({ songs, onPlay, onQueue, currentSongId, isPlaying, onOpenArtist }) {
  const [addedId, setAddedId] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const handleQueue = (song) => {
    onQueue(song);
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const handleContextMenu = (e, song) => {
    e.preventDefault();
    e.stopPropagation();
    
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    setContextMenu({ song, x, y });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 px-3 sm:px-4">
      {songs.map((song) => {
        const isActive = currentSongId != null && song.id === currentSongId;
        const cover = resolveCover(song.album?.cover_medium || song.album?.cover_big || song.album?.cover_small, song.title || song.id);
        return (
          <div
            key={song._uniqueKey || song.id + "-" + song.title}
            onClick={() => setSelectedSong(song)}
            onContextMenu={(e) => handleContextMenu(e, song)}
            className={`
              relative group
              p-2.5 sm:p-3 lg:p-4
              rounded-lg sm:rounded-xl
              flex flex-col items-start
              truncate
              w-full
              cursor-pointer
              transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-black/50
              touch-manipulation
              ${isActive
                ? "bg-gradient-to-b from-green-900/30 to-neutral-900/50 ring-1 ring-green-500/40"
                : "bg-[#181818] hover:bg-[#282828]"}
            `}
          >
            {}
            <div className="relative w-full aspect-square overflow-hidden rounded-md sm:rounded-lg mb-3 sm:mb-4 shadow-lg">
              <img referrerPolicy="no-referrer"
                src={cover}
                alt={song.title}
                onError={coverError(song.title || song.id)}
                className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {/* Playing indicator badge */}
              {isActive && (
                <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-1 flex items-center gap-1 shadow-md">
                  {isPlaying ? <Equalizer /> : <Music2 className="w-3 h-3 text-green-400" />}
                </div>
              )}
            </div>

            {}
            <div className="mt-0.5 sm:mt-1 w-full px-0.5 sm:px-1">
              <p className={`text-xs sm:text-sm font-semibold truncate leading-tight ${isActive ? "text-green-400" : "text-white"}`}>
                {song.title}
              </p>
              <p
                className="text-neutral-400 text-[10px] sm:text-xs truncate mt-0.5 sm:mt-1 transition-colors hover:text-white cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (song.artist?.id) onOpenArtist?.(song.artist.id);
                }}
              >
                {song.artist?.name || "Unknown Artist"}
              </p>
            </div>
          </div>
        );
      })}

      {selectedSong && (
        <SongDetailsModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
          onPlay={(s) => onPlay(s, songs)}
          onQueue={onQueue}
          onOpenArtist={onOpenArtist}
        />
      )}

      {contextMenu && (
        <ContextMenu
          song={contextMenu.song}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onPlay={(s) => onPlay(s, songs)}
          onQueue={handleQueue}
          onOpenArtist={onOpenArtist}
        />
      )}
    </div>
  );
}
