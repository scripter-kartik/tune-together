"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, LocateFixed } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";
import LyricsSyncAdjuster from "./LyricsSyncAdjuster";
import { useLyricsOffset } from "@/hooks/useLyricsOffset";

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
  const [isFollowing, setIsFollowing] = useState(true);
  const activeLineRef = useRef(null);
  const bodyRef = useRef(null);
  const didInitialScroll = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(null);

  // Per-song lyric timing offset (persisted). Positive = lyrics later.
  const { offset: lyricsOffset, adjust: adjustLyricsOffset, reset: resetLyricsOffset } =
    useLyricsOffset(song?.id);

  // Portals need the DOM — only render after mount (avoids SSR crash).
  useEffect(() => setMounted(true), []);

  // Reset the "copied" flourish when switching songs.
  useEffect(() => setCopied(false), [song?.id]);

  const synced = useMemo(
    () => (data?.syncedLyrics ? parseLRC(data.syncedLyrics) : null),
    [data]
  );

  // Index of the currently-sung line (applies the user's timing offset).
  const activeIndex = useMemo(() => {
    if (!synced || synced.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= currentTime + lyricsOffset + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [synced, currentTime, lyricsOffset]);

  useEffect(() => {
    didInitialScroll.current = false;
    setIsFollowing(true);
  }, [isOpen, song?.id]);

  const markProgrammaticScroll = useCallback((duration = 650) => {
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, duration);
  }, []);

  const scrollToActiveLine = useCallback((behavior = "smooth") => {
    const body = bodyRef.current;
    if (!body) return false;

    const line = activeLineRef.current;
    if (!line) {
      markProgrammaticScroll(150);
      body.scrollTo({ top: 0, behavior });
      return false;
    }

    const top = Math.max(
      0,
      line.offsetTop - body.clientHeight / 2 + line.clientHeight / 2
    );
    markProgrammaticScroll(behavior === "smooth" ? 650 : 150);
    body.scrollTo({ top, behavior });
    return true;
  }, [markProgrammaticScroll]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isFollowing || status !== "ready") return;

    const didScroll = scrollToActiveLine(
      didInitialScroll.current ? "smooth" : "auto"
    );

    if (didScroll) {
      didInitialScroll.current = true;
    } else if (!didInitialScroll.current && bodyRef.current) {
      didInitialScroll.current = true;
    }
  }, [activeIndex, isFollowing, isOpen, scrollToActiveLine, status]);

  const handleManualBrowse = () => {
    if (programmaticScrollRef.current || !synced?.length) return;
    setIsFollowing(false);
  };

  const handleScroll = () => {
    if (programmaticScrollRef.current || !synced?.length) return;
    setIsFollowing(false);
  };

  const handleJumpToCurrent = () => {
    setIsFollowing(true);
    didInitialScroll.current = true;
    scrollToActiveLine("smooth");
  };

  const handleLineSeek = (time) => {
    setIsFollowing(true);
    onSeek?.(time);
  };

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
          <img referrerPolicy="no-referrer"
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
        className="relative flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-3 sm:py-4 flex-shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {song && (
            <img referrerPolicy="no-referrer"
              src={resolveCover(song.album?.cover_small, song.title || song.id)}
              alt={song.title}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover shadow-lg flex-shrink-0"
              onError={coverError(song.title || song.id)}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm sm:text-base truncate">{song?.title}</p>
            <p className="text-white/60 text-xs sm:text-sm truncate">{song?.artist?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {synced && synced.length > 0 && (
            <LyricsSyncAdjuster
              offset={lyricsOffset}
              onAdjust={adjustLyricsOffset}
              onReset={resetLyricsOffset}
            />
          )}
          {hasLyrics && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xs sm:text-sm font-medium touch-manipulation"
              aria-label="Copy lyrics"
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors touch-manipulation"
            aria-label="Close lyrics"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 md:px-10"
        onPointerDown={handleManualBrowse}
        onTouchMove={handleManualBrowse}
        onWheel={handleManualBrowse}
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 sm:py-32 text-white/60">
              <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm sm:text-base">Finding lyrics…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-2 py-24 sm:py-32 text-center text-white/60">
              <p className="text-xl sm:text-2xl font-bold text-white">No lyrics found</p>
              <p className="text-xs sm:text-sm">We couldn&apos;t find lyrics for this track.</p>
            </div>
          )}

          {status === "ready" && synced && (
            <div className="pt-4 sm:pt-6 pb-[50vh] sm:pb-[45vh]">
              {synced.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => handleLineSeek(line.time)}
                    className={`cursor-pointer select-none text-2xl sm:text-3xl md:text-[2.75rem] leading-tight font-extrabold tracking-tight py-1.5 sm:py-2 origin-left transition-all duration-300 touch-manipulation ${
                      isActive
                        ? "text-white scale-100"
                        : "text-white/40 hover:text-white/70 scale-[0.98]"
                    }`}
                  >
                    {line.text || "♪"}
                  </p>
                );
              })}
              <p className="text-[10px] sm:text-xs text-white/30 pt-4 sm:pt-6">Lyrics provided by LRCLIB</p>
            </div>
          )}

          {status === "ready" && !synced && data?.plainLyrics && (
            <div className="py-12 sm:py-16">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-4 sm:mb-6">
                Lyrics not time-synced
              </p>
              <pre className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white/90 whitespace-pre-wrap font-sans leading-relaxed tracking-tight">
                {data.plainLyrics}
              </pre>
              <p className="text-[10px] sm:text-xs text-white/30 pt-6 sm:pt-8">Lyrics provided by LRCLIB</p>
            </div>
          )}
        </div>
      </div>

      {status === "ready" && synced && !isFollowing && (
        <button
          onClick={handleJumpToCurrent}
          className="fixed bottom-6 sm:bottom-5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 sm:gap-2 rounded-full bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-black shadow-xl shadow-black/40 transition hover:scale-[1.03] active:scale-100 touch-manipulation"
          aria-label="Sync to current lyric"
        >
          <LocateFixed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Sync lyrics
        </button>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
