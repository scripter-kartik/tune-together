"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Parse LRC synced lyrics ("[mm:ss.xx] text") into [{ time, text }], sorted.
function parseLRC(lrc) {
  const out = [];
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const line of lrc.split(/\r?\n/)) {
    const times = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3], 10) / Math.pow(10, m[3].length) : 0;
      times.push(min * 60 + sec + frac);
    }
    const text = line.replace(re, "").trim();
    for (const t of times) out.push({ time: t, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export default function LyricsView({ song, currentTime, isOpen, onClose, onSeek }) {
  const [data, setData] = useState(null); // { syncedLyrics, plainLyrics }
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [mounted, setMounted] = useState(false);
  const fetchedIdRef = useRef(null);
  const activeLineRef = useRef(null);

  // Portals need the DOM — only render after mount (avoids SSR crash).
  useEffect(() => setMounted(true), []);

  // Fetch lyrics when the overlay is open (once per song).
  useEffect(() => {
    if (!isOpen || !song) return;
    if (fetchedIdRef.current === song.id && data) return;

    let cancelled = false;
    setStatus("loading");
    setData(null);
    fetchedIdRef.current = song.id;

    const params = new URLSearchParams({
      id: String(song.id),
      title: song.title || "",
      artist: song.artist?.name || "",
      album: song.album?.title || "",
      duration: song.duration ? String(song.duration) : "",
    });

    fetch(`/api/lyrics?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.syncedLyrics || res.plainLyrics) {
          setData(res);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, song?.id]);

  const synced = useMemo(
    () => (data?.syncedLyrics ? parseLRC(data.syncedLyrics) : null),
    [data]
  );

  // Index of the currently-sung line.
  const activeIndex = useMemo(() => {
    if (!synced || synced.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= currentTime + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [synced, currentTime]);

  // Keep the active line centered.
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeIndex]);

  if (!isOpen || !mounted) return null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-[#1e3a34] via-[#121212] to-black">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {song?.album?.cover_small && (
            <img
              src={song.album.cover_small}
              alt={song.title}
              className="w-11 h-11 rounded object-cover shadow-lg"
            />
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{song?.title}</p>
            <p className="text-white/60 text-sm truncate">{song?.artist?.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Close lyrics"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-white/60">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p>Finding lyrics…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-2 py-32 text-center text-white/60">
              <p className="text-2xl font-bold text-white">No lyrics found</p>
              <p className="text-sm">We couldn&apos;t find lyrics for this track.</p>
            </div>
          )}

          {status === "ready" && synced && (
            <div className="py-[45vh]">
              {synced.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => onSeek?.(line.time)}
                    className={`cursor-pointer select-none text-3xl md:text-[2.75rem] leading-tight font-extrabold tracking-tight py-2 origin-left transition-all duration-300 ${
                      isActive
                        ? "text-white scale-100"
                        : "text-white/40 hover:text-white/70 scale-[0.98]"
                    }`}
                  >
                    {line.text || "♪"}
                  </p>
                );
              })}
            </div>
          )}

          {status === "ready" && !synced && data?.plainLyrics && (
            <div className="py-16">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-6">
                Lyrics not time-synced
              </p>
              <pre className="text-2xl md:text-3xl font-extrabold text-white/90 whitespace-pre-wrap font-sans leading-relaxed tracking-tight">
                {data.plainLyrics}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
