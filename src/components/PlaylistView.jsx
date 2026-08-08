"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pause, Plus, Check, Music2, ListMusic, ListPlus, Minus, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { resolveCover, coverError } from "../lib/coverPlaceholder";
import CollaboratorsModal from "./CollaboratorsModal";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0];
}

function formatTime(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// In-app playlist view. Renders inside the home page (like AlbumView) instead
// of navigating to a separate route, so the player never unmounts and whatever
// is currently playing keeps playing while you browse.
export default function PlaylistView({
  playlist,
  onClose,
  onPlay,
  onQueue,
  currentSongId,
  isPlaying,
  onOpenArtist,
  onUpdatePlaylist,
}) {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const { user } = useUser();

  const ownerId = playlist?.userId;
  const isOwner = ownerId && user?.id && String(ownerId) === String(user.id);
  const isCollaborator = (playlist?.collaborators || []).some(
    (c) => String(c) === String(user?.id)
  );
  const canEdit = isOwner || isCollaborator;
  const collaboratorInfo = playlist?.collaboratorInfo || [];

  const gradient = playlist?.gradient || "from-purple-600 to-blue-600";
  const coverUrl = resolveCover(playlist?.image, playlist?.name || playlist?.id);

  useEffect(() => {
    // Custom user playlists already carry their songs inline
    if (Array.isArray(playlist?.songs)) {
      setSongs(playlist.songs);
      setIsLoading(false);
      return;
    }

    if (!playlist?.artist) { setIsLoading(false); return; }
    let cancelled = false;
    const fetchSongs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(playlist.artist)}`);
        if (!res.ok) throw new Error("Failed to load playlist");
        const data = await res.json();
        if (cancelled) return;
        setSongs(data.songs || []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Could not load this playlist.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchSongs();
    return () => { cancelled = true; };
  }, [playlist?.id, playlist?.artist, playlist?.songs]);

  const handleQueue = (song) => {
    onQueue?.(song);
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const playAll = () => {
    if (songs.length) onPlay(songs[0], songs);
  };

  const queueAll = () => {
    songs.forEach((song) => onQueue?.(song));
  };

  // Owner or collaborator may remove songs (stays in sync for everyone).
  const handleRemove = async (track) => {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: playlist._id, song: track, action: "remove" }),
      });
      const data = await res.json();
      if (data.success) {
        setSongs((prev) => prev.filter((s) => String(s.id) !== String(track.id)));
        window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
      }
    } catch {}
  };

  const handleCollaboratorsUpdate = (updatedPlaylist) => {
    setShowCollaborators(false);
    onUpdatePlaylist?.(updatedPlaylist);
    window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">
      {/* Header */}
      <div className={`relative bg-gradient-to-b ${gradient} to-[#121212] pt-16 pb-8 px-6 md:px-8`}>
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="flex-shrink-0 shadow-2xl shadow-black/60">
            <img referrerPolicy="no-referrer"
              src={coverUrl}
              alt={playlist?.name}
              className="w-44 h-44 md:w-56 md:h-56 rounded shadow-2xl object-cover"
              onError={coverError(playlist?.name || playlist?.id)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight line-clamp-2">
              {playlist?.name}
            </h1>
            <div className="flex items-center gap-2 text-neutral-200 text-sm mt-2 flex-wrap">
              <span className="font-bold text-white">{playlist?.artist}</span>
              {songs.length > 0 && (
                <>
                  <span className="text-white/50">•</span>
                  <span>{songs.length} songs</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Collaborator avatars */}
              {collaboratorInfo.length > 0 && (
                <div className="flex -space-x-2">
                  {collaboratorInfo.slice(0, 5).map((collab) =>
                    collab.imageUrl ? (
                      <img referrerPolicy="no-referrer"
                        key={collab.clerkId}
                        src={collab.imageUrl}
                        alt={collab.name}
                        title={collab.name}
                        className="w-7 h-7 rounded-full object-cover border-2 border-[#121212]"
                      />
                    ) : (
                      <div
                        key={collab.clerkId}
                        title={collab.name}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-indigo-500 border-2 border-[#121212] flex items-center justify-center text-[10px] font-bold text-white"
                      >
                        {getInitials(collab.name)}
                      </div>
                    )
                  )}
                </div>
              )}
              <button
                onClick={() => setShowCollaborators(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 ${
                  collaboratorInfo.length > 0
                    ? "border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "border-[var(--tt-border)] text-white hover:bg-white/10"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {collaboratorInfo.length > 0
                  ? `${collaboratorInfo.length} ${collaboratorInfo.length === 1 ? "collaborator" : "collaborators"}`
                  : "Collaborate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Tracks */}
      <div className="px-6 md:px-8 py-4 flex flex-col gap-6 pb-12">
        {songs.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={playAll}
              className="w-14 h-14 bg-green-500 hover:bg-green-400 hover:scale-105 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-500/25"
              title="Play all"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>
            <button
              onClick={queueAll}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--tt-border)] text-white text-sm font-semibold hover:bg-white/10 transition-all duration-200"
              title="Queue all songs"
            >
              <ListPlus className="w-4 h-4" />
              Queue All
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
            <p className="text-neutral-400 animate-pulse">Loading playlist…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-400">
            <ListMusic className="w-10 h-10" />
            <p className="text-sm">{error}</p>
          </div>
        ) : songs.length > 0 ? (
          <div className="flex flex-col">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-3 py-2 border-b border-[var(--tt-border)] mb-2">
              <span className="text-neutral-400 text-xs font-medium w-5 text-right">#</span>
              <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Title</span>
              <span className="text-neutral-400 text-xs font-medium tabular-nums">⏱</span>
            </div>

            {songs.map((track, idx) => {
              const isActive = currentSongId === track.id;
              return (
                <div
                  key={track._uniqueKey || track.id || idx}
                  className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-3 py-2.5 rounded-lg group cursor-pointer transition-colors ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                  onClick={() => {
                    if (isActive && isPlaying) {
                      window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "pause" } }));
                    } else if (isActive) {
                      window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "play" } }));
                    } else {
                      onPlay(track, songs);
                    }
                  }}
                >
                  <span className="text-neutral-500 w-5 text-right text-sm select-none">
                    {isActive && isPlaying ? (
                      <>
                        <Music2 className="w-4 h-4 text-green-400 animate-pulse group-hover:hidden" />
                        <Pause className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                      </>
                    ) : (
                      <>
                        <span className={`group-hover:hidden ${isActive ? "hidden" : ""}`}>{idx + 1}</span>
                        <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-3 min-w-0">
                    <img referrerPolicy="no-referrer"
                      src={resolveCover(track.album?.cover_small || track.album?.cover_medium, track.title || track.id)}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                      onError={coverError(track.title || track.id)}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${isActive ? "text-green-400" : "text-white"}`}>
                        {track.title}
                      </p>
                      <p
                        className="text-neutral-400 text-xs truncate hover:text-white hover:underline transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (track.artist?.id) onOpenArtist?.(track.artist.id);
                        }}
                      >
                        {track.artist?.name || "Unknown Artist"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(track); }}
                        className="transition p-1 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        title="Remove from playlist"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQueue(track); }}
                      className={`transition p-1 ${addedId === track.id ? "text-green-400 opacity-100" : "text-neutral-400 hover:text-white active:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                      title="Add to queue"
                    >
                      {addedId === track.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <span className="text-neutral-400 text-sm tabular-nums">{formatTime(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-500">
            <ListMusic className="w-10 h-10" />
            <p className="text-sm">No songs in this playlist yet.</p>
          </div>
        )}
      </div>

      {showCollaborators && (
        <CollaboratorsModal
          playlist={playlist}
          onClose={() => setShowCollaborators(false)}
          onUpdate={handleCollaboratorsUpdate}
        />
      )}
    </div>
  );
}
