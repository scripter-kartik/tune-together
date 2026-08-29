"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLyrics } from "@/hooks/useLyrics";
import { useLyricsOffset } from "@/hooks/useLyricsOffset";
import { LocateFixed, MicVocal } from "lucide-react";


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

export default function SidebarLyrics({ song }) {
  const { lyricsData, lyricsStatus } = useLyrics(song);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const bodyRef = useRef(null);
  const activeLineRef = useRef(null);
  const didInitialScroll = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(null);

  // Shared per-song timing offset so sidebar + fullscreen stay in sync.
  const { offset: lyricsOffset } = useLyricsOffset(song?.id);

  useEffect(() => {
    const handleTimeUpdate = (e) => {
      const time = Number(e.detail);
      if (Number.isFinite(time)) setCurrentTime(time);
    };

    window.addEventListener("tt-time-update", handleTimeUpdate);
    return () => window.removeEventListener("tt-time-update", handleTimeUpdate);
  }, []);

  const synced = useMemo(
    () => (lyricsData?.syncedLyrics ? parseLRC(lyricsData.syncedLyrics) : null),
    [lyricsData]
  );

  const providerName =
    lyricsData?.provider === "youtube"
      ? "YouTube Music"
      : lyricsData?.provider === "genius"
        ? "Genius"
        : "LRCLIB";

  const activeIndex = useMemo(() => {
    if (!synced || synced.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= currentTime + lyricsOffset + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [synced, currentTime, lyricsOffset]);

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
    didInitialScroll.current = false;
    setIsFollowing(true);
    setCurrentTime(0);

    if (!song) return;

    const probe = { position: 0 };
    window.dispatchEvent(new CustomEvent("tt-get-position", { detail: probe }));
    if (Number.isFinite(probe.position)) setCurrentTime(probe.position);
  }, [song?.id]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFollowing || lyricsStatus !== "ready") return;

    const didScroll = scrollToActiveLine(
      didInitialScroll.current ? "smooth" : "auto"
    );

    if (didScroll) {
      didInitialScroll.current = true;
    } else if (!didInitialScroll.current && bodyRef.current) {
      didInitialScroll.current = true;
    }
  }, [activeIndex, isFollowing, lyricsStatus, scrollToActiveLine]);

  const handleSeek = (time) => {
    setCurrentTime(time);
    setIsFollowing(true);
    window.dispatchEvent(new CustomEvent("tt-lyric-seek", { detail: { time } }));
  };

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

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <MicVocal className="w-12 h-12 text-neutral-600 mb-3" />
        <p className="text-gray-400 text-sm">Play a song to see lyrics</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#121212] relative min-h-0">
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 py-8 relative"
        ref={bodyRef}
        onPointerDown={handleManualBrowse}
        onTouchMove={handleManualBrowse}
        onWheel={handleManualBrowse}
        onScroll={handleScroll}
      >
        {lyricsStatus === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-white/60">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading...</p>
          </div>
        )}

        {lyricsStatus === "error" && (
          <div className="flex flex-col items-center justify-center gap-2 h-full text-center text-white/60">
            <p className="font-bold text-white">No lyrics</p>
            <p className="text-xs">We couldn't find lyrics for this track.</p>
          </div>
        )}

        {lyricsStatus === "ready" && synced && (
          <div className="pt-2 pb-[55vh]">
            {synced.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <p
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleSeek(line.time)}
                  className={`text-lg md:text-xl font-bold leading-snug py-1.5 transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "text-white scale-[1.02]"
                      : "text-white/30 hover:text-white/70"
                  }`}
                >
                  {line.text || "♪"}
                </p>
              );
            })}
          </div>
        )}

        {lyricsStatus === "ready" && !synced && lyricsData?.plainLyrics && (
          <div className="py-8">
            <pre className="text-sm md:text-base font-bold text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
              {lyricsData.plainLyrics}
            </pre>
            <p className="text-[10px] text-neutral-600 pt-4">
              Lyrics provided by {providerName}
            </p>
          </div>
        )}
      </div>
      {lyricsStatus === "ready" && synced && !isFollowing && (
        <button
          onClick={handleJumpToCurrent}
          className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-black shadow-lg shadow-black/40 transition hover:scale-[1.03] active:scale-100"
          aria-label="Sync to current lyric"
        >
          <LocateFixed className="w-4 h-4" />
          Sync lyrics
        </button>
      )}
    </div>
  );
}
