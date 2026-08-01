"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Check } from "lucide-react";
import { formatRemaining } from "@/hooks/useSleepTimer";

const PRESETS = [
  { label: "5 minutes", minutes: 5 },
  { label: "10 minutes", minutes: 10 },
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "45 minutes", minutes: 45 },
  { label: "1 hour", minutes: 60 },
];

export default function SleepTimerMenu({
  timer,
  remainingMs,
  onSetTimer,
  onEndOfTrack,
  onEndOfQueue,
  onClear,
  disabled,
  hasTrack = true,
}) {
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

  const isActive = !!timer;
  const activeLabel = timer?.type === "track" ? "End of track" : timer?.type === "queue" ? "End of queue" : null;

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors relative ${
          isOpen || isActive ? "text-green-500" : "text-neutral-300 hover:text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Sleep timer"
        title="Sleep timer"
        disabled={disabled}
      >
        <Moon size={18} />
        {isActive && timer?.type === "timer" && remainingMs != null && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-4 px-1 bg-green-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {formatRemaining(remainingMs).split(" ")[0]}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#282828] border border-[var(--tt-border)] rounded-xl shadow-2xl p-2 animate-fade-in-up z-50">
          <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
            <Moon size={12} /> Sleep timer
          </div>

          {isActive && (
            <div className="mx-2 mb-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-between">
              <span className="text-green-400 text-xs font-semibold">
                {activeLabel || formatRemaining(remainingMs)}
              </span>
              <button
                onClick={onClear}
                className="text-neutral-300 hover:text-white text-xs font-semibold px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
              >
                Off
              </button>
            </div>
          )}

          <div className="flex flex-col">
            {PRESETS.map((p) => (
              <button
                key={p.minutes}
                onClick={() => {
                  onSetTimer(p.minutes);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors"
              >
                <span>{p.label}</span>
                {timer?.type === "timer" &&
                  Math.round((timer.endsAt - Date.now()) / 60000) === p.minutes && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
              </button>
            ))}

            <div className="h-px bg-white/10 my-1.5 mx-2" />

            <button
              onClick={() => {
                onEndOfTrack();
                setIsOpen(false);
              }}
              disabled={!hasTrack}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-white transition-colors ${
                hasTrack ? "hover:bg-white/10" : "opacity-40 cursor-not-allowed"
              }`}
            >
              <span>End of track</span>
              {timer?.type === "track" && <Check className="w-4 h-4 text-green-500" />}
            </button>

            <button
              onClick={() => {
                onEndOfQueue();
                setIsOpen(false);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors"
            >
              <span>End of queue</span>
              {timer?.type === "queue" && <Check className="w-4 h-4 text-green-500" />}
            </button>
          </div>

          <div className="absolute -bottom-1.5 right-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#282828]" />
        </div>
      )}
    </div>
  );
}
