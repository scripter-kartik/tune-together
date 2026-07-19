"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MicVocal, ListMusic, Heart } from "lucide-react";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

const fmt = (t) => {
  if (isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// Full-screen "Now Playing" sheet (Spotify-style), opened by tapping the
// mobile mini-player. Rendered through a portal so it sits above everything
// including the footer. Playback state/handlers come from PlayerFooter.
export default function NowPlayingView({
  song,
  isOpen,
  onClose,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  onSeek,
  onPlayPause,
  onPrev,
  onNext,
  onOpenLyrics,
  onOpenQueue,
  showLyrics,
}) {
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLiked(false), [song?.id]);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || !song) return null;

  const cover = resolveCover(
    song.album?.cover_xl ||
      song.album?.cover_big ||
      song.album?.cover_medium ||
      song.album?.cover_small,
    song.title || song.id
  );
  const pct = (currentTime / (duration || 30)) * 100;

  const overlay = (
    <div className="fixed inset-0 z-[9990] flex flex-col overflow-hidden animate-slide-up">
      {/* Immersive blurred album-art backdrop */}
      <img
        src={cover}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#33333f]/40 via-black/85 to-black" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col h-full px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.75rem)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between py-3 flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Minimize"
            className="p-2 -ml-2 text-white/90 hover:text-white active:scale-90 transition-transform"
          >
            <ChevronDown size={28} />
          </button>
          <div className="min-w-0 px-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              Now Playing
            </p>
            <p className="text-xs font-semibold text-white/90 truncate">
              {song.album?.title || song.artist?.name}
            </p>
          </div>
          <button
            onClick={onOpenQueue}
            aria-label="Queue"
            className="p-2 -mr-2 text-white/90 hover:text-white active:scale-90 transition-transform"
          >
            <ListMusic size={22} />
          </button>
        </div>

        {/* Album art */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-4">
          <img
            src={cover}
            alt={song.title}
            className="w-full max-w-[min(80vw,22rem)] aspect-square object-cover rounded-2xl shadow-2xl shadow-black/70"
            onError={coverError(song.title || song.id)}
          />
        </div>

        {/* Title + like */}
        <div className="flex items-end justify-between gap-4 flex-shrink-0 mb-5">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-white truncate leading-tight">
              {song.title}
            </h1>
            <p className="text-[15px] text-white/60 truncate mt-0.5">
              {song.artist?.name}
            </p>
          </div>
          <button
            onClick={() => setLiked((v) => !v)}
            aria-label={liked ? "Unlike" : "Like"}
            className="p-1 flex-shrink-0 active:scale-90 transition-transform"
          >
            <Heart
              size={26}
              className={liked ? "fill-green-500 text-green-500" : "text-white/80 hover:text-white"}
            />
          </button>
        </div>

        {/* Seek bar */}
        <div className="flex-shrink-0 mb-4">
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={onSeek}
            aria-label="Seek"
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full"
            style={{
              background: `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.25) ${pct}%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-white/60 tabular-nums">{fmt(currentTime)}</span>
            <span className="text-[11px] text-white/60 tabular-nums">{fmt(duration)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-9 flex-shrink-0 mb-6">
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="text-white/90 hover:text-white active:scale-90 transition-transform"
          >
            <FaBackward size={28} />
          </button>
          <button
            onClick={onPlayPause}
            disabled={isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
            className={`bg-white text-black w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-lg transition-transform ${
              isLoading ? "opacity-70" : "active:scale-95 hover:scale-[1.03]"
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <FaPause size={26} />
            ) : (
              <FaPlay size={26} className="ml-1" />
            )}
          </button>
          <button
            onClick={onNext}
            aria-label="Next"
            className="text-white/90 hover:text-white active:scale-90 transition-transform"
          >
            <FaForward size={28} />
          </button>
        </div>

        {/* Utility row */}
        <div className="flex items-center justify-center gap-14 flex-shrink-0">
          <button
            onClick={onOpenLyrics}
            aria-label="Lyrics"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              showLyrics ? "text-green-400" : "text-white/70 hover:text-white"
            }`}
          >
            <MicVocal size={20} />
            <span>Lyrics</span>
          </button>
          <button
            onClick={onOpenQueue}
            aria-label="Queue"
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-white/70 hover:text-white transition-colors"
          >
            <ListMusic size={20} />
            <span>Queue</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
