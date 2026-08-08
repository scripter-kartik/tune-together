'use client'

import { useState, useEffect, useRef } from "react";
import { Plus, Check, Play, Pause, Music2, ListMusic, MoreVertical, X } from "lucide-react";
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
  const menuRef = useRef(null);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/playlists")
        .then(r => r.json())
        .then(d => { if (d.success) setPlaylists(d.playlists); });
    }
  }, [isSignedIn]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const addToPlaylist = async (playlistId) => {
    setAddedToId(playlistId);
    await fetch("/api/playlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, song, action: "add" }),
    });
    setTimeout(() => { setAddedToId(null); onClose(); }, 800);
  };

  // Clamp menu so it doesn't go off screen
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
              {playlists.length === 0 ? (
                <p className="px-4 py-2 text-neutral-500 text-xs">No playlists yet. Create one in Your Library.</p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl._id}
                    onClick={() => addToPlaylist(pl._id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-neutral-300 transition-colors hover:text-white hover:bg-white/10 text-left"
                  >
                    <span className="truncate">{pl.name}</span>
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
  const [contextMenu, setContextMenu] = useState(null); // { song, x, y }

  const handleQueue = (song) => {
    onQueue(song);
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const handleContextMenu = (e, song) => {
    e.preventDefault();
    e.stopPropagation();
    // Clamp to viewport
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
            {/* Cover art */}
            <div className="relative w-full aspect-square overflow-hidden rounded-md sm:rounded-lg mb-3 sm:mb-4 shadow-lg">
              <img referrerPolicy="no-referrer"
                src={cover}
                alt={song.title}
                onError={coverError(song.title || song.id)}
                className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {/* Play/Pause button overlay — reflects the current song's state */}
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 translate-y-0 opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300">
                <button
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 hover:bg-green-400 active:scale-95 hover:scale-105 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 transition-all duration-200 touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive && isPlaying) {
                      window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "pause" } }));
                    } else if (isActive) {
                      window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "play" } }));
                    } else {
                      onPlay(song, songs);
                    }
                  }}
                  aria-label={`${isActive && isPlaying ? "Pause" : "Play"} ${song.title}`}
                >
                  {isActive && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black" />
                  ) : (
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Now playing indicator */}
            {isActive && (
              <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 flex items-center gap-1 sm:gap-1.5 bg-black/70 rounded-full pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1 backdrop-blur-sm">
                {isPlaying ? <Equalizer /> : <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                <span className="text-[9px] sm:text-[10px] font-semibold text-green-400">
                  {isPlaying ? "Playing" : "Paused"}
                </span>
              </div>
            )}

            {/* Three-dot menu button (always visible on mobile, hover on desktop) */}
            <button
              onClick={(e) => handleContextMenu(e, song)}
              className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black/70 text-white hover:bg-black/90 shadow-lg transition-all duration-200 touch-manipulation"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Queue button */}
            {onQueue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQueue(song);
                }}
                className={`absolute top-10 sm:top-12 right-2 sm:right-3 z-10 transition-all duration-200 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-lg touch-manipulation ${
                  addedId === song.id
                    ? "opacity-100 bg-green-500 text-white scale-110"
                    : "opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-black/70 text-white hover:bg-green-500 active:bg-green-500 hover:scale-110"
                }`}
                title={addedId === song.id ? "Added to queue" : "Add to queue"}
                aria-label="Add to queue"
              >
                {addedId === song.id ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            )}

            {/* Song info */}
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
