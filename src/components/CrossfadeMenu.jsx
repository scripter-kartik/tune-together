"use client";

import { useState, useRef, useEffect } from "react";
import { Crosshair } from "lucide-react";
import { CROSSFADE_PRESETS } from "@/hooks/useCrossfade";

export default function CrossfadeMenu({ fadeSeconds, onSet, disabled, onOpen }) {
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

  const active = fadeSeconds > 0;

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => {
          if (disabled) return;
          if (!isOpen) onOpen?.();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${
          isOpen || active ? "text-green-500" : "text-neutral-300 hover:text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Crossfade"
        title="Crossfade"
        disabled={disabled}
      >
        <Crosshair size={18} />
        {active && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-4 px-1 bg-green-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {fadeSeconds}s
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#282828] border border-[var(--tt-border)] rounded-xl shadow-2xl p-2 animate-fade-in-up z-50">
          <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
            <Crosshair size={12} /> Crossfade
          </div>

          <div className="flex flex-col">
            {CROSSFADE_PRESETS.map((seconds) => (
              <button
                key={seconds}
                onClick={() => {
                  onSet(seconds);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  fadeSeconds === seconds
                    ? "text-green-400 bg-white/5"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <span>{seconds === 0 ? "Off" : `${seconds} seconds`}</span>
              </button>
            ))}
          </div>

          <p className="px-3 pt-1.5 pb-1 text-[11px] text-neutral-500 leading-snug">
            Smoothly fades the end of each track into the next.
          </p>

          <div className="absolute -bottom-1.5 right-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#282828]" />
        </div>
      )}
    </div>
  );
}
