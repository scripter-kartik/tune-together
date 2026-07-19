"use client";
import { X, Play, Plus } from "lucide-react";
import { hiResCover } from "../lib/coverArt";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

export default function SongDetailsModal({ song, onClose, onPlay, onQueue, onOpenArtist }) {
  if (!song) return null;

  const rawCover =
    song.album?.cover_xl || song.album?.cover_big || song.album?.cover_medium;
  const cover = rawCover ? hiResCover(rawCover, 800) : resolveCover(null, song.title || song.id);

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#181818] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 sm:h-80 w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent z-10" />
          <img
            src={cover}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={coverError(song.title || song.id)}
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-8 pt-2 relative z-20 -mt-20 sm:-mt-24">
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg truncate">{song.title}</h2>
            <div className="flex items-center gap-2 text-neutral-300 text-sm sm:text-base mt-2 flex-wrap">
              <div 
                className="flex items-center gap-2 hover:underline cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenArtist && song.artist?.id) {
                    onOpenArtist(song.artist.id);
                    onClose();
                  }
                }}
              >
                {song.artist?.picture_small && (
                  <img src={song.artist.picture_small} alt={song.artist.name} className="w-6 h-6 rounded-full" onError={coverError(song.artist.name)} />
                )}
                <span className="font-semibold text-white group-hover:text-green-400 transition-colors">{song.artist?.name}</span>
              </div>
              <span>•</span>
              <span>{song.album?.title}</span>
              {song.duration && (
                <>
                  <span>•</span>
                  <span>{formatTime(song.duration)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                onPlay(song);
                onClose();
              }}
              className="flex-1 sm:flex-none bg-green-500 hover:bg-green-400 text-black font-bold rounded-full px-8 py-3 flex items-center justify-center gap-2 transition-transform hover:scale-[1.03] active:scale-95 shadow-lg shadow-green-500/20"
            >
              <Play className="w-5 h-5 fill-current" />
              Play Now
            </button>

            {onQueue && (
              <button
                onClick={() => {
                  onQueue(song);
                  onClose();
                }}
                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-6 py-3 flex items-center justify-center gap-2 transition-transform hover:scale-[1.03] active:scale-95 ring-1 ring-white/15"
              >
                <Plus className="w-5 h-5" />
                Add to Queue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
