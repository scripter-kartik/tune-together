"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Minus, Plus, RotateCcw } from "lucide-react";

const MAX_OFFSET = 15; 

export default function LyricsSyncAdjuster({ offset, onAdjust, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = offset !== 0;
  
  const markerPct = Math.max(-100, Math.min(100, (offset / MAX_OFFSET) * 100));
  const direction = offset < 0 ? "earlier" : offset > 0 ? "later" : "on time";

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-9 sm:px-3.5 rounded-full transition-colors text-xs sm:text-sm font-medium touch-manipulation ${
          isOpen || active
            ? "text-green-500 bg-white/10"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
        aria-label="Adjust lyric timing"
        title="Adjust lyric timing"
      >
        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {active && (
          <span className="tabular-nums hidden sm:inline">
            {offset > 0 ? "+" : ""}
            {offset.toFixed(1)}s
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 sm:mt-2 w-[calc(100vw-2.5rem)] max-w-[280px] sm:w-64 bg-[#242424]/95 backdrop-blur border border-[var(--tt-border)] rounded-2xl shadow-2xl px-4 pb-4 pt-2.5 animate-fade-in-up z-50">
          {}
          <div className="relative mb-3 flex items-center justify-center">
            <span className="flex items-center gap-1.5 leading-none text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              Sync timing
            </span>
            {active && (
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="absolute right-0 inset-y-0 flex items-center gap-1 text-[11px] sm:text-xs text-neutral-400 hover:text-white transition-colors touch-manipulation"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAdjust(-0.5)}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 active:bg-white/20 border border-white/5 text-white transition-colors touch-manipulation"
              aria-label="Earlier by half a second"
              title="Earlier (−0.5s)"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <p
                className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${
                  active ? "text-green-500" : "text-white"
                }`}
              >
                {offset > 0 ? "+" : ""}
                {offset.toFixed(1)}s
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                {direction}
              </p>
            </div>

            <button
              onClick={() => onAdjust(0.5)}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 active:bg-white/20 border border-white/5 text-white transition-colors touch-manipulation"
              aria-label="Later by half a second"
              title="Later (+0.5s)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {}
          <div className="relative mt-4 h-1.5 rounded-full bg-white/5">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow shadow-green-500/50 transition-all"
              style={{ left: `calc(${50 + markerPct / 2}% - 4px)` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-neutral-600 font-medium">
            <span>−15s</span>
            <span>0</span>
            <span>+15s</span>
          </div>

          {}
          <p className="text-[11px] text-neutral-500 mt-3 text-center leading-snug">
            {offset < 0
              ? "Lyrics run late — nudging them earlier."
              : offset > 0
              ? "Lyrics run early — nudging them later."
              : "Lyrics feel off? Nudge them earlier or later."}
          </p>
        </div>
      )}
    </div>
  );
}
