"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Minus, Plus, RotateCcw } from "lucide-react";

/**
 * Compact lyric-timing offset control. Opens a small stepper panel that
 * shifts the synced lyric timing by ±0.5s steps, clamped to ±15s.
 */
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

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors text-sm font-medium ${
          isOpen || active
            ? "text-green-500 bg-white/10"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
        aria-label="Adjust lyric timing"
        title="Adjust lyric timing"
      >
        <Clock className="w-4 h-4" />
        {active && (
          <span className="tabular-nums">
            {offset > 0 ? "+" : ""}
            {offset.toFixed(1)}s
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-60 bg-[#242424] border border-[var(--tt-border)] rounded-xl shadow-2xl p-3 animate-fade-in-up z-50">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Sync timing
            </span>
            {active && (
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAdjust(-0.5)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors"
              aria-label="Earlier by half a second"
              title="Earlier (−0.5s)"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <p className={`text-xl font-bold tabular-nums ${active ? "text-green-500" : "text-white"}`}>
                {offset > 0 ? "+" : ""}
                {offset.toFixed(1)}s
              </p>
              <p className="text-[10px] text-neutral-500 -mt-0.5">offset</p>
            </div>

            <button
              onClick={() => onAdjust(0.5)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors"
              aria-label="Later by half a second"
              title="Later (+0.5s)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 mt-2.5 leading-snug">
            {offset < 0
              ? "Lyrics are showing late — moving them earlier."
              : offset > 0
              ? "Lyrics are showing early — moving them later."
              : "If the lyrics feel off, nudge them forward or back."}
          </p>
        </div>
      )}
    </div>
  );
}
