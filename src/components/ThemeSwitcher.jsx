"use client";

import { useState, useEffect, useRef } from "react";
import { Palette, Check } from "lucide-react";
import { createPortal } from "react-dom";

const THEMES = [
  { id: "green",  label: "Forest",  accent: "#1db954", bg: "#121212", rail: "#000000", grad: "from-emerald-900/40" },
  { id: "purple", label: "Cosmic",  accent: "#a855f7", bg: "#0f0a1a", rail: "#060311", grad: "from-purple-900/40" },
  { id: "blue",   label: "Ocean",   accent: "#3b82f6", bg: "#0a0f1a", rail: "#040811", grad: "from-blue-900/40" },
  { id: "rose",   label: "Rose",    accent: "#f43f5e", bg: "#1a0a0e", rail: "#110407", grad: "from-rose-900/40" },
  { id: "amber",  label: "Amber",   accent: "#f59e0b", bg: "#1a1200", rail: "#110c00", grad: "from-amber-900/40" },
  { id: "cyan",   label: "Ice",     accent: "#06b6d4", bg: "#050f14", rail: "#02090d", grad: "from-cyan-900/40" },
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--tt-accent", theme.accent);
  root.style.setProperty("--tt-accent-hover", theme.accent + "cc");
  root.style.setProperty("--tt-bg", theme.bg);
  root.style.setProperty("--tt-rail", theme.rail);
  try { localStorage.setItem("tt-theme", theme.id); } catch {}
}

export function getStoredThemeId() {
  try { return localStorage.getItem("tt-theme") || "green"; } catch { return "green"; }
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("green");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    const stored = getStoredThemeId();
    const theme = THEMES.find(t => t.id === stored) || THEMES[0];
    setActiveId(theme.id);
    applyTheme(theme);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        const panel = document.getElementById("tt-theme-panel");
        if (panel && panel.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelHeight = 260;
      const panelWidth = 220;
      const top = Math.min(rect.top, window.innerHeight - panelHeight - 8);
      // Put to the right of the button
      const left = Math.min(rect.right + 10, window.innerWidth - panelWidth - 8);
      setPanelPos({ top, left });
    }
    setOpen(o => !o);
  };

  const handleSelect = (theme) => {
    setActiveId(theme.id);
    applyTheme(theme);
    setOpen(false);
  };

  const activeTheme = THEMES.find(t => t.id === activeId) || THEMES[0];

  const panel = open && typeof document !== "undefined" && createPortal(
    <div
      id="tt-theme-panel"
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
      className="w-52 bg-[#181818] border border-white/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.07]">
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Appearance</p>
        <p className="text-white text-sm font-semibold mt-0.5">{activeTheme.label} theme</p>
      </div>

      {/* Theme grid */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {THEMES.map(theme => {
          const isActive = activeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={`relative flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.12] ring-1 ring-white/20"
                  : "hover:bg-white/[0.07]"
              }`}
              title={theme.label}
            >
              {/* Color swatch */}
              <div
                className="w-8 h-8 rounded-full transition-transform duration-200 hover:scale-110"
                style={{
                  background: `conic-gradient(from 180deg, ${theme.accent}, ${theme.accent}99, ${theme.accent}44, ${theme.accent})`,
                  boxShadow: isActive
                    ? `0 0 0 2px ${theme.accent}55, 0 4px 16px ${theme.accent}66`
                    : `0 2px 8px ${theme.accent}33`,
                }}
              />
              {/* Active check */}
              {isActive && (
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                </div>
              )}
              <span className={`text-[10px] font-semibold leading-none transition-colors ${
                isActive ? "text-white" : "text-neutral-500"
              }`}>
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative flex items-center justify-center w-full">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-300 ${
          open
            ? "rounded-[16px]"
            : "hover:rounded-[16px]"
        }`}
        style={{
          backgroundColor: open ? `${activeTheme.accent}22` : "#181818",
          color: open ? activeTheme.accent : "#9ca3af",
        }}
        title="Change Theme"
      >
        <Palette className="w-5 h-5" />
      </button>
      {panel}
    </div>
  );
}
