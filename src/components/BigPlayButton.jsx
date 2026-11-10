"use client";

import { Play, Pause, Shuffle } from "lucide-react";

/**
 * The big green button on album / playlist / mix pages. Shows pause while one
 * of its tracks is playing and toggles playback instead of restarting.
 */
export default function BigPlayButton({ tracks = [], currentSongId, isPlaying, onPlay, label = "this list", className = "" }) {
  const playingHere = currentSongId != null && tracks.some((t) => String(t.id) === String(currentSongId));
  const showPause = playingHere && isPlaying;
  return (
    <button
      type="button"
      disabled={!tracks.length}
      onClick={() => {
        if (playingHere) {
          window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: isPlaying ? "pause" : "play" } }));
        } else if (tracks.length) {
          onPlay(tracks[0], tracks);
        }
      }}
      aria-label={showPause ? `Pause ${label}` : `Play ${label}`}
      title={showPause ? "Pause" : "Play"}
      className={`w-14 h-14 bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-500/25 ${className}`}
    >
      {showPause ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-0.5" />}
    </button>
  );
}

/** Shuffle-play the list (random order), shown next to the big play button. */
export function ShuffleListButton({ tracks = [], onPlay, label = "this list" }) {
  return (
    <button
      type="button"
      disabled={tracks.length < 2}
      onClick={() => {
        const shuffled = [...tracks];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        onPlay(shuffled[0], shuffled);
      }}
      aria-label={`Shuffle play ${label}`}
      title="Shuffle play"
      className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-30 transition"
    >
      <Shuffle className="w-6 h-6" />
    </button>
  );
}
