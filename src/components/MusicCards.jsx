"use client";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import SongDetailsModal from "./SongDetailsModal";

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
    setTimeout(
      () => setAddedId((cur) => (cur === song.id ? null : cur)),
      1200
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6 p-4">
      {songs.map((song) => {
        const isActive = currentSongId != null && song.id === currentSongId;
        return (
        <div
          key={song._uniqueKey || song.id + "-" + song.title_short}
          onClick={() => setSelectedSong(song)}
          className={`
            relative group
            p-3 md:p-4
            rounded-xl
            flex flex-col items-start
            truncate
            w-full
            cursor-pointer
            transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]
            ${isActive
              ? "bg-gradient-to-b from-green-500/20 to-neutral-900/40 ring-1 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
              : "bg-[#181818] hover:bg-[#242424]"}
          `}
        >
          <div className="relative w-full aspect-square overflow-hidden rounded-lg mb-4">
            <img
              src={song.album.cover_medium}
              alt={song.title}
              className="
                object-cover w-full h-full
                group-hover:scale-105 group-hover:brightness-75 transition-all duration-500 ease-out
              "
            />
          </div>

          {isActive && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 rounded-full pl-2 pr-2.5 py-1">
              {isPlaying ? (
                <Equalizer />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
              <span className="text-[10px] font-semibold text-green-400">
                {isPlaying ? "Playing" : "Paused"}
              </span>
            </div>
          )}

          {onQueue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleQueue(song);
              }}
              className={`absolute top-2 right-2 z-10 transition-all rounded-full w-8 h-8 flex items-center justify-center shadow-lg ${
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

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <button
              className="bg-green-500 p-2 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(song);
              }}
            >
              <img src="/play.png" alt="play" className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-2 w-full px-1">
            <p className={`text-sm font-medium truncate ${isActive ? "text-green-400" : "text-white"}`}>
              {song.title}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {song.artist.name}
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
