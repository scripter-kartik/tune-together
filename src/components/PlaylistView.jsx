"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Play, Pause, Plus, Check, Music2, ListMusic, ListPlus, Minus,
  Users, Search, Trash2, Pencil, X,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { resolveCover, coverError } from "../lib/coverPlaceholder";
import CollaboratorsModal from "./CollaboratorsModal";
import { useConfirm } from "./ConfirmDialog";

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

// "Find songs" modal — search then tap to add, Spotify style.
function AddSongsModal({ playlistId, existingIds, onClose, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.songs || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addSong = async (song) => {
    setAddingId(song.id);
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, song, action: "add" }),
      });
      const data = await res.json();
      if (data.success) onAdded?.(song);
    } catch {
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#1e1e1e] border border-[var(--tt-border)] rounded-t-xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tt-border)] flex-shrink-0">
          <h3 className="text-sm font-bold text-white">Add songs</h3>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-black/50 border border-[var(--tt-border)] rounded-lg px-3">
            <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs…"
              className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-neutral-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-10">
              {query ? "No results." : "Search for a song to add."}
            </p>
          ) : (
            results.map((song) => {
              const already = existingIds.has(String(song.id));
              return (
                <button
                  key={song.id}
                  disabled={already}
                  onClick={() => addSong(song)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40 disabled:hover:bg-transparent text-left"
                >
                  <img referrerPolicy="no-referrer"
                    src={resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title || song.id)}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={coverError(song.title || song.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{song.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{song.artist?.name || "Unknown Artist"}</p>
                  </div>
                  {already ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" /> Added
                    </span>
                  ) : addingId === song.id ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
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
  const confirmAction = useConfirm();
  const [playlistData, setPlaylistData] = useState(playlist);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const { user } = useUser();

  // Live playlist object — starts as the prop, then replaced by a fresh fetch.
  const pl = playlistData || playlist;

  const ownerId = pl?.userId;
  const isOwner = ownerId && user?.id && String(ownerId) === String(user.id);
  const isCollaborator = (pl?.collaborators || []).some(
    (c) => String(c) === String(user?.id)
  );
  const canEdit = isOwner || isCollaborator;
  const collaboratorInfo = pl?.collaboratorInfo || [];

  const gradient = pl?.gradient || "from-purple-600 to-blue-600";
  const coverUrl = resolveCover(pl?.image, pl?.name || pl?.id);

  useEffect(() => {
    // Reset to the incoming prop when the playlist changes.
    setPlaylistData(playlist);
    setShowAddSongs(false);
    setIsRenaming(false);

    // User playlists always carry a Mongo _id — fetch fresh so add/remove/rename
    // from anywhere in the app shows up immediately (the sidebar prop can be stale).
    if (playlist?._id) {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      fetch(`/api/playlists/${playlist._id}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled || !data?.success) return;
          setPlaylistData(data.playlist);
          setSongs(data.playlist?.songs || []);
        })
        .catch(() => {
          if (!cancelled) setSongs(playlist.songs || []);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => { cancelled = true; };
    }

    // Preset playlists: either they carry songs inline…
    if (Array.isArray(playlist?.songs)) {
      setSongs(playlist.songs);
      setIsLoading(false);
      return;
    }

    // …or they're built from an artist search.
    if (!playlist?.artist) {
      setIsLoading(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist?.id, playlist?._id, playlist?.artist]);

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
    if (!canEdit || !pl?._id) return;
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: pl._id, song: track, action: "remove" }),
      });
      const data = await res.json();
      if (data.success) {
        setSongs((prev) => prev.filter((s) => String(s.id) !== String(track.id)));
        setPlaylistData((prev) =>
          prev ? { ...prev, songs: (prev.songs || []).filter((s) => String(s.id) !== String(track.id)) } : prev
        );
        window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
      }
    } catch {}
  };

  const handleRename = async () => {
    const name = draftName.trim();
    setIsRenaming(false);
    if (!name || name === pl?.name || !pl?._id || !isOwner) return;
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: pl._id, action: "rename", name }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylistData((prev) => ({ ...(prev || pl), name }));
        window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!pl?._id || !isOwner) return;
    const ok = await confirmAction({
      title: "Delete playlist?",
      message: `"${pl.name}" and all its songs will be permanently deleted.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/playlists?id=${pl._id}`, { method: "DELETE" });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
      onClose();
    }
  };

  const handleSongAdded = (song) => {
    setSongs((prev) =>
      prev.some((s) => String(s.id) === String(song.id)) ? prev : [...prev, song]
    );
    setPlaylistData((prev) => {
      if (!prev) return prev;
      if (prev.songs?.some((s) => String(s.id) === String(song.id))) return prev;
      return { ...prev, songs: [...(prev.songs || []), song] };
    });
    window.dispatchEvent(new CustomEvent("tt-playlists-updated"));
  };

  const handleCollaboratorsUpdate = (updatedPlaylist) => {
    setShowCollaborators(false);
    setPlaylistData(updatedPlaylist);
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

        {/* Delete (owner only) */}
        {isOwner && pl?._id && (
          <button
            onClick={handleDelete}
            className="absolute top-5 right-5 p-2 bg-black/40 hover:bg-red-500/20 hover:text-red-400 rounded-full text-neutral-300 transition-colors"
            title="Delete playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="flex-shrink-0 shadow-2xl shadow-black/60">
            {coverUrl ? (
              <img referrerPolicy="no-referrer"
                src={coverUrl}
                alt={pl?.name}
                className="w-44 h-44 md:w-56 md:h-56 rounded shadow-2xl object-cover"
                onError={coverError(pl?.name || pl?.id)}
              />
            ) : (
              <div className={`w-44 h-44 md:w-56 md:h-56 rounded bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <Music2 className="w-16 h-16 md:w-20 md:h-20 text-white/80 drop-shadow-lg" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Playlist</p>
            {isRenaming ? (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                onBlur={handleRename}
                className="bg-black/40 border border-white/30 rounded-md px-2 py-1 text-3xl md:text-5xl font-black text-white tracking-tight outline-none focus:border-green-400 w-full max-w-xl"
              />
            ) : (
              <div className="flex items-center gap-2 group/name">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight line-clamp-2">
                  {pl?.name}
                </h1>
                {isOwner && pl?._id && (
                  <button
                    onClick={() => { setDraftName(pl?.name); setIsRenaming(true); }}
                    className="p-1.5 text-white/40 hover:text-white transition-colors opacity-0 group-hover/name:opacity-100"
                    title="Rename playlist"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-neutral-200 text-sm mt-2 flex-wrap">
              {(pl?.owner?.name || pl?.artist) && (
                <span className="font-bold text-white">{pl?.owner?.name || pl?.artist}</span>
              )}
              {songs.length > 0 && (
                <>
                  {(pl?.owner?.name || pl?.artist) && <span className="text-white/50">•</span>}
                  <span>{songs.length} {songs.length === 1 ? "song" : "songs"}</span>
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
          <div className="flex items-center gap-4 flex-wrap">
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
            {canEdit && pl?._id && (
              <button
                onClick={() => setShowAddSongs(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--tt-border)] text-white text-sm font-semibold hover:bg-white/10 hover:border-white/30 transition-all duration-200"
                title="Add songs to this playlist"
              >
                <Plus className="w-4 h-4" />
                Add songs
              </button>
            )}
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
                    {canEdit && pl?._id && (
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
            <p className="text-sm">This playlist is empty.</p>
            {canEdit && pl?._id ? (
              <button
                onClick={() => setShowAddSongs(true)}
                className="mt-2 px-6 py-2.5 bg-green-500 hover:bg-green-400 hover:scale-105 text-black text-sm font-bold rounded-full transition-all duration-200 shadow-lg shadow-green-500/25"
              >
                Find songs
              </button>
            ) : (
              <p className="text-xs text-neutral-600">No songs yet.</p>
            )}
          </div>
        )}
      </div>

      {showCollaborators && (
        <CollaboratorsModal
          playlist={pl}
          onClose={() => setShowCollaborators(false)}
          onUpdate={handleCollaboratorsUpdate}
        />
      )}

      {showAddSongs && pl?._id && (
        <AddSongsModal
          playlistId={pl._id}
          existingIds={new Set(songs.map((s) => String(s.id)))}
          onClose={() => setShowAddSongs(false)}
          onAdded={handleSongAdded}
        />
      )}
    </div>
  );
}
