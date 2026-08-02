"use client";

import { useMemo } from "react";
import { Play, Music2 } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

/** Tiny animated equalizer bars — shown on the tile that's currently playing. */
function MiniEqualizer() {
  return (
    <div className="flex gap-0.5 items-end h-3">
      <span className="w-0.5 bg-green-400 animate-pulse h-1.5" />
      <span className="w-0.5 bg-green-400 animate-pulse h-3" style={{ animationDelay: "0.2s" }} />
      <span className="w-0.5 bg-green-400 animate-pulse h-2" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}

/**
 * Spotify-style "Recently played" quick-picks grid.
 * Renders the tiles only — the section header lives in the caller (HomeFeed)
 * so this stays a small, standalone component.
 */
export default function RecentlyPlayed({ history = [], onPlay, expanded = false, currentSongId, isPlaying }) {
  const deduped = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const item of history) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  }, [history]);

  if (!deduped.length) return null;

  const shown = expanded ? deduped.slice(0, 20) : deduped.slice(0, 6);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 px-3 sm:px-4">
      {shown.map((item) => {
        const cover = resolveCover(
          item.album?.cover_medium ||
            item.album?.cover_small ||
            item.album?.cover_big
        );
        const isActive = currentSongId && item.id === currentSongId;
        return (
          <div
            key={item.id}
            onClick={() => onPlay?.(item, deduped)}
            className={`group relative flex items-center gap-2 sm:gap-3 rounded-md bg-[#181818] hover:bg-[#282828] h-12 sm:h-14 overflow-hidden cursor-pointer transition-colors duration-200 animate-fade-up touch-manipulation ${
              isActive ? "ring-2 ring-[var(--tt-accent)]" : ""
            }`}
            title={item.title}
          >
            <div className="relative h-full aspect-square flex-shrink-0 overflow-hidden bg-[#282828]">
              {cover ? (
                <img referrerPolicy="no-referrer"
                  src={cover}
                  alt={item.title}
                  onError={coverError()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-10 sm:pr-12">
              <p className="text-white text-xs sm:text-sm font-semibold truncate leading-tight">
                {item.title}
              </p>
              <p className="text-neutral-400 text-[10px] sm:text-xs truncate mt-0.5">
                {item.artist?.name || "Unknown Artist"}
              </p>
            </div>
            {isActive && isPlaying ? (
              <div className="absolute right-2 sm:right-3 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
                <MiniEqualizer />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(item, deduped);
                }}
                aria-label={`Play ${item.title}`}
                className="absolute right-2 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-95 flex items-center justify-center shadow-xl shadow-green-500/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 touch-manipulation"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black ml-0.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
