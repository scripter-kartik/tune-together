"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLyrics } from "@/hooks/useLyrics";
import { MicVocal } from "lucide-react";

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

export default function SidebarLyrics({ song }) {
  const { lyricsData, lyricsStatus } = useLyrics(song);
  const [currentTime, setCurrentTime] = useState(0);
  const bodyRef = useRef(null);
  const activeLineRef = useRef(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    const handleTimeUpdate = (e) => setCurrentTime(e.detail);
    window.addEventListener("tt-time-update", handleTimeUpdate);
    return () => window.removeEventListener("tt-time-update", handleTimeUpdate);
  }, []);

  const synced = useMemo(
    () => (lyricsData?.syncedLyrics ? parseLRC(lyricsData.syncedLyrics) : null),
    [lyricsData]
  );

  const activeIndex = useMemo(() => {
    if (!synced || synced.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= currentTime + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [synced, currentTime]);

  useEffect(() => {
    didInitialScroll.current = false;
  }, [song?.id]);

  useEffect(() => {
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
  }, [activeIndex, lyricsStatus]);

  const handleSeek = (time) => {
    // We dispatch tt-sync-seek (same event socket would send, or we could just use tt-seek if PlayerFooter listens)
    // Wait, PlayerFooter has handleLyricSeek. It doesn't listen to window events for it natively without a special wrapper.
    // Let's dispatch a custom event that PlayerFooter can listen to if needed.
    // Right now we can just rely on the existing tt-sync-seek mechanism.
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
    <div className="flex-1 flex flex-col bg-[#181818] relative min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-8 relative scrollbar-hide" ref={bodyRef}>
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
          <div className="py-[30vh]">
            {synced.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <p
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleSeek(line.time)}
                  className={`text-lg md:text-xl font-bold leading-snug py-1.5 transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "text-white"
                      : "text-white/30 hover:text-white/60"
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
          </div>
        )}
      </div>
    </div>
  );
}
