"use client";

import { useState } from "react";
import { ArrowLeft, Play, Plus, Check, Music2, ListMusic } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

function formatTime(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function CollectionView({
  collection,
  onClose,
  onPlay,
  onQueue,
  currentSongId,
  isPlaying,
  onOpenArtist,
}) {
  const [addedId, setAddedId] = useState(null);

  if (!collection) return null;

  const tracks = collection.songs || [];
  const coverUrl = resolveCover(collection.cover, collection.title || collection.id);

  const handleQueue = (song) => {
    onQueue?.(song);
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const playAll = () => {
    if (!tracks.length) return;
    // Pass the collection as the playback context so Next/Prev walk it.
    onPlay(tracks[0], tracks);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-[#3a3a52] to-[#121212] pt-16 pb-8 px-6 md:px-8">
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
              alt={collection.title}
              className="w-44 h-44 md:w-56 md:h-56 rounded shadow-2xl object-cover"
              onError={coverError(collection.title || collection.id)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight line-clamp-2">
              {collection.title}
            </h1>
            <div className="flex items-center gap-2 text-neutral-300 text-sm mt-2 flex-wrap">
              <span className="font-bold text-white">tune-together</span>
              <span className="text-neutral-500">•</span>
              <span>{tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Tracks */}
      <div className="px-6 md:px-8 py-4 flex flex-col gap-6 pb-12">
        {tracks.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={playAll}
              className="w-14 h-14 bg-green-500 hover:bg-green-400 hover:scale-105 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-500/25"
              title="Play all"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>
          </div>
        )}

        {tracks.length > 0 ? (
          <div className="flex flex-col">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-3 py-2 border-b border-[var(--tt-divider)] mb-2">
              <span className="text-neutral-400 text-xs font-medium w-5 text-right">#</span>
              <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Title</span>
              <span className="text-neutral-400 text-xs font-medium tabular-nums">⏱</span>
            </div>

            {tracks.map((track, idx) => {
              const isActive = currentSongId === track.id;
              return (
                <div
                  key={track._uniqueKey || track.id || idx}
                  className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-3 py-2.5 rounded-lg group cursor-pointer transition-colors ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                  onClick={() => onPlay(track, tracks)}
                >
                  <span className="text-neutral-500 w-5 text-right text-sm select-none">
                    {isActive && isPlaying ? (
                      <>
                        <Music2 className="w-4 h-4 text-green-400 animate-pulse group-hover:hidden" />
                        <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
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
            <p className="text-sm">No songs in this collection yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
