'use client'

import { useState, useEffect } from "react";
import { Plus, Check, Play, Music2 } from "lucide-react";
import SongDetailsModal from "./SongDetailsModal";
import { coverPlaceholder } from "../lib/coverPlaceholder";

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

export default function MusicCards({ songs, onPlay, onQueue, currentSongId, isPlaying, onOpenArtist }) {
  const [addedId, setAddedId] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  const handleQueue = (song) => {
    onQueue(song);
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-5 p-4">
      {songs.map((song) => {
        const isActive = currentSongId != null && song.id === currentSongId;
        const fallback = coverPlaceholder(song.title || song.id);
        const cover = song.album?.cover_medium || song.album?.cover_big || song.album?.cover_small || fallback;
        return (
          <div
            key={song._uniqueKey || song.id + "-" + song.title}
            onClick={() => setSelectedSong(song)}
            className={`
              relative group
              p-3 md:p-4
              rounded-xl
              flex flex-col items-start
              truncate
              w-full
              cursor-pointer
              transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50
              ${isActive
                ? "bg-gradient-to-b from-green-900/30 to-neutral-900/50 ring-1 ring-green-500/40"
                : "bg-[#181818] hover:bg-[#282828]"}
            `}
          >
            {/* Cover art */}
            <div className="relative w-full aspect-square overflow-hidden rounded-lg mb-4 shadow-lg">
              <img
                src={cover}
                alt={song.title}
                onError={e => { e.target.src = fallback; }}
                className="object-cover w-full h-full group-hover:scale-105 transition-all duration-500 ease-out"
              />
              {/* Play button overlay */}
              <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button
                  className="w-10 h-10 bg-green-500 hover:bg-green-400 hover:scale-105 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(song);
                  }}
                >
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                </button>
              </div>
            </div>

            {/* Now playing indicator */}
            {isActive && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/70 rounded-full pl-2 pr-2.5 py-1 backdrop-blur-sm">
                {isPlaying ? <Equalizer /> : <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                <span className="text-[10px] font-semibold text-green-400">
                  {isPlaying ? "Playing" : "Paused"}
                </span>
              </div>
            )}

            {/* Queue button */}
            {onQueue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQueue(song);
                }}
                className={`absolute top-3 right-3 z-10 transition-all rounded-full w-8 h-8 flex items-center justify-center shadow-lg ${
                  addedId === song.id
                    ? "opacity-100 bg-green-500 text-white scale-110"
                    : "opacity-0 group-hover:opacity-100 bg-black/70 text-white hover:bg-green-500 hover:scale-110"
                }`}
                title={addedId === song.id ? "Added to queue" : "Add to queue"}
                aria-label="Add to queue"
              >
                {addedId === song.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Song info */}
            <div className="mt-1 w-full px-1">
              <p className={`text-sm font-semibold truncate leading-tight ${isActive ? "text-green-400" : "text-white"}`}>
                {song.title}
              </p>
              <p
                className="text-neutral-400 text-xs truncate mt-1 hover:text-white transition-colors cursor-pointer"
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
          onPlay={onPlay}
          onQueue={onQueue}
          onOpenArtist={onOpenArtist}
        />
      )}
    </div>
  );
}
