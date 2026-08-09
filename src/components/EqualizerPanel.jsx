"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Info, RotateCcw } from "lucide-react";
import { EQ_PRESETS } from "@/hooks/useEqualizer";

const fmtFreq = (hz) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

const EFFECTS = [
  { key: "bassBoost", label: "Bass" },
  { key: "spatial", label: "3D" },
  { key: "nightMode", label: "Night" },
  { key: "loudness", label: "Loudness" },
];

export default function EqualizerPanel({
  settings,
  wired,
  bands,
  sourceKind,
  onSetGain,
  onPreset,
  onToggleEffect,
  onReset,
  disabled,
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

  // True whenever anything is customized vs the default settings (a moved band,
  // an enabled effect, or loudness turned off) — drives the indicator dot.
  const isActive =
    !!settings &&
    (settings.gains.some((g) => g !== 0) ||
      settings.effects.bassBoost !== 0 ||
      settings.effects.spatial !== 0 ||
      settings.effects.nightMode !== false ||
      settings.effects.loudness !== true);

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${
          isOpen || isActive ? "text-[var(--tt-accent)]" : "text-neutral-300 hover:text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Equalizer"
        title={isActive ? "Equalizer & effects — active" : "Equalizer & effects"}
        disabled={disabled}
      >
        <SlidersHorizontal size={18} />
      </button>

      {isOpen && settings && (
        <div className="absolute bottom-full right-0 mb-2 w-[320px] sm:w-[420px] max-w-[calc(100vw-2rem)] bg-[#202020] border border-[var(--tt-border)] rounded-xl shadow-2xl p-3 animate-fade-in-up z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              <SlidersHorizontal size={12} /> Equalizer
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {!wired && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300/90 text-[11px]">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                This source fell back to <span className="font-semibold">“{sourceKind || "unknown"}”</span>,
                which can't be routed through the equalizer. EQ applies whenever the proxy stream or a preview is playing.
              </span>
            </div>
          )}

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.keys(EQ_PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => onPreset(name)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  JSON.stringify(settings.gains) === JSON.stringify(EQ_PRESETS[name])
                    ? "bg-green-500 text-black"
                    : "bg-white/5 text-neutral-300 hover:bg-white/15"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* 10-band sliders */}
          <div className="flex items-end justify-between gap-1 px-1 mb-3">
            {bands.map((freq, i) => (
              <div key={freq} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={settings.gains[i] || 0}
                  onChange={(e) => onSetGain(i, parseFloat(e.target.value))}
                  aria-label={`${fmtFreq(freq)} Hz band`}
                  className="eq-band-slider"
                  style={{ "--band-gain": `${((settings.gains[i] || 0) + 10) * 5}%` }}
                />
                <span className={`text-[9px] font-medium ${settings.gains[i] ? "text-green-400" : "text-neutral-500"}`}>
                  {fmtFreq(freq)}
                </span>
              </div>
            ))}
          </div>

          {/* Effect toggles */}
          <div className="flex items-center justify-center gap-2 mb-1">
            {EFFECTS.map((fx) => {
              const on = settings.effects[fx.key] > 0 || settings.effects[fx.key] === true;
              return (
                <button
                  key={fx.key}
                  onClick={() => onToggleEffect(fx.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    on ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-neutral-300 hover:bg-white/15"
                  }`}
                >
                  {fx.label}
                </button>
              );
            })}
          </div>

          <div className="absolute -bottom-1.5 right-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#202020]" />
        </div>
      )}
    </div>
  );
}
