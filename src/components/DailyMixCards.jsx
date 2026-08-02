"use client";

import { Play, Music2 } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

/** Tiny animated equalizer bars — shown on the card that's currently playing. */
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
 * Spotify-style "Made for you" Daily Mix cards — a horizontal scrollable row.
 * Each card is a per-artist mix built server-side from the user's top artists.
 * Clicking a card opens it as a collection (CollectionView); the hover play
 * button plays the mix immediately with the mix as its context.
 */
export default function DailyMixCards({ mixes = [], onPlay, onOpenCollection, currentSongId, isPlaying }) {
  if (!mixes?.length) return null;

  return (
    <div className="flex overflow-x-auto scrollbar-hide gap-3 sm:gap-4 px-3 sm:px-4 pb-2">
      {mixes.map((mix) => {
        const cover = resolveCover(mix.cover);
        const mixPlaying = isPlaying && currentSongId && mix.songs?.some((s) => s.id === currentSongId);
        return (
          <div
            key={mix.id || mix.title}
            onClick={() => onOpenCollection?.(mix)}
            className={`group relative flex-shrink-0 w-40 sm:w-44 rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 sm:hover:-translate-y-1 animate-fade-up touch-manipulation ${
              mixPlaying ? "ring-2 ring-[var(--tt-accent)]" : ""
            }`}
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--tt-accent) 55%, #000), var(--tt-accent-2))",
            }}
          >
            <div className="relative p-2.5 sm:p-3 flex flex-col gap-2.5 sm:gap-3">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md shadow-lg overflow-hidden bg-black/30 flex-shrink-0">
                {cover ? (
                  <img referrerPolicy="no-referrer"
                    src={cover}
                    alt={mix.title}
                    onError={coverError()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
                  </div>
                )}
                {mixPlaying && (
                  <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                    <MiniEqualizer />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs sm:text-sm truncate leading-tight">{mix.title}</p>
                <p className="text-white/70 text-[10px] sm:text-xs truncate mt-0.5 sm:mt-1">
                  {mix.subtitle ? `Based on ${mix.subtitle}` : "Made for you"}
                </p>
              </div>
            </div>

            {mix.songs?.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(mix.songs[0], mix.songs);
                }}
                aria-label={`Play ${mix.title}`}
                className="absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-95 flex items-center justify-center shadow-xl shadow-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 translate-y-0 transition-all duration-200 touch-manipulation"
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
