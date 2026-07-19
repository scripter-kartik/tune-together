"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

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

// `lyrics` ({ syncedLyrics, plainLyrics }) and `status` are prefetched by the
// parent (PlayerFooter) as soon as the song changes, so opening is instant.
export default function LyricsView({ song, currentTime, isOpen, onClose, onSeek, lyrics, status = "idle" }) {
  const data = lyrics;
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const activeLineRef = useRef(null);
  const bodyRef = useRef(null);
  const didInitialScroll = useRef(false);

  // Portals need the DOM — only render after mount (avoids SSR crash).
  useEffect(() => setMounted(true), []);

  // Reset the "copied" flourish when switching songs.
  useEffect(() => setCopied(false), [song?.id]);

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

  // Re-arm the "snap instantly" behavior each time the panel opens or the
  // song changes, so the first scroll after opening is immediate.
  useEffect(() => {
    didInitialScroll.current = false;
  }, [isOpen, song?.id]);

  // Keep the active line centered. The first scroll after opening snaps
  // instantly (so the lyrics are visible the moment you click), and every
  // subsequent line change smooth-scrolls. If no line is active yet (the song
  // hasn't reached the first lyric), jump to the top so lyrics show right away
  // instead of leaving the reader staring at blank space.
  //
  // We scroll the body container manually rather than using
  // `scrollIntoView`, which walks up and scrolls *every* scrollable ancestor
  // (and the page itself) — that was dragging the whole fixed overlay upward
  // and clipping the header off the top of the screen.
  useEffect(() => {
    if (!isOpen) return;
    const body = bodyRef.current;
    if (!body) return;
    const line = activeLineRef.current;
    if (line) {
      const top = line.offsetTop - body.clientHeight / 2 + line.clientHeight / 2;
      body.scrollTo({
        top,
        behavior: didInitialScroll.current ? "smooth" : "auto",
      });
      didInitialScroll.current = true;
    } else if (!didInitialScroll.current) {
      body.scrollTop = 0;
    }
  }, [activeIndex, isOpen, status]);

  const handleCopy = () => {
    const text =
      data?.plainLyrics ||
      (synced ? synced.map((l) => l.text).join("\n") : "");
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!isOpen || !mounted) return null;

  const cover = resolveCover(
    song?.album?.cover_xl || song?.album?.cover_big || song?.album?.cover_medium,
    song?.title || song?.id
  );
  const hasLyrics = status === "ready" && (synced || data?.plainLyrics);

  const overlay = (
    // Sits above the footer (70px mobile / 90px desktop) so the playback bar
    // with the current song stays visible — like Spotify's lyrics view.
    <div className="fixed inset-x-0 top-0 bottom-[70px] md:bottom-[90px] z-[9999] flex flex-col overflow-hidden bg-[#0b0b0b]">
      {/* Immersive blurred album-art backdrop */}
      {cover && (
        <>
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/95" />
        </>
      )}

      {/* Header — pad the top for the mobile status bar / notch (safe area) so
          the title and buttons aren't clipped against the screen edge. */}
      <div
        className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-4 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {song && (
            <img
              src={resolveCover(song.album?.cover_small, song.title || song.id)}
              alt={song.title}
              className="w-12 h-12 rounded object-cover shadow-lg"
              onError={coverError(song.title || song.id)}
            />
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{song?.title}</p>
            <p className="text-white/60 text-sm truncate">{song?.artist?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasLyrics && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
              aria-label="Copy lyrics"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close lyrics"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="relative flex-1 min-h-0 overflow-y-auto px-6 md:px-10">
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
            <div className="py-[40vh]">
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
              <p className="text-xs text-white/30 pt-6">Lyrics provided by LRCLIB</p>
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
              <p className="text-xs text-white/30 pt-8">Lyrics provided by LRCLIB</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
