"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Music, X, Play } from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

function fmtDuration(s) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
}

/**
 * Floating song search popover for the chat composer. Debounced /api/search,
 * plus a one-tap "share what's playing" row when `nowPlaying` is set.
 * onPick(song) closes the picker and hands the song to the composer.
 */
export default function SongPicker({ nowPlaying, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { songs: [] };
        setResults((data.songs || []).slice(0, 12));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const coverOf = (song) =>
    resolveCover(song.album?.cover_medium, song.title || song.id);

  const Row = ({ song, badge }) => (
    <button
      onClick={() => onPick(song)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.07] active:bg-white/10 transition text-left group"
    >
      <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
        <img
          src={coverOf(song)}
          alt=""
          onError={coverError(song.title || song.id)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{song.title}</p>
        <p className="text-xs text-neutral-500 truncate">
          {song.artist?.name}
          {song.duration ? ` · ${fmtDuration(song.duration)}` : ""}
        </p>
      </div>
      {badge && (
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/15 border border-green-500/30 rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-20 px-0">
      <div className="bg-[#161616]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search a song to share…"
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar p-1.5">
          {/* One-tap share of whatever is playing right now */}
          {nowPlaying && !query.trim() && (
            <Row song={nowPlaying} badge="Playing" />
          )}

          {searching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400" />
            </div>
          ) : results.length > 0 ? (
            results.map((s) => <Row key={s.id} song={s} />)
          ) : query.trim() ? (
            <p className="text-center text-xs text-neutral-500 py-8">
              No songs found
            </p>
          ) : (
            !nowPlaying && (
              <div className="flex flex-col items-center py-8 text-center px-6">
                <Music className="w-6 h-6 text-neutral-600 mb-2" />
                <p className="text-xs text-neutral-500">
                  Search for a track to drop it in the chat
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
