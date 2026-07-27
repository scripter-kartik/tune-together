"use client";

import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { createPortal } from "react-dom";

const THEMES = [
  { id: "green",  label: "Forest",  accent: "#1db954", bg: "#121212", rail: "#000000" },
  { id: "purple", label: "Cosmic",  accent: "#a855f7", bg: "#0f0a1a", rail: "#060311" },
  { id: "blue",   label: "Ocean",   accent: "#3b82f6", bg: "#0a0f1a", rail: "#040811" },
  { id: "rose",   label: "Rose",    accent: "#f43f5e", bg: "#1a0a0e", rail: "#110407" },
  { id: "amber",  label: "Amber",   accent: "#f59e0b", bg: "#1a1200", rail: "#110c00" },
  { id: "cyan",   label: "Ice",     accent: "#06b6d4", bg: "#050f14", rail: "#02090d" },
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
      // Anchor to bottom of button so panel doesn't go off screen
      const panelHeight = 180;
      const top = Math.min(rect.top, window.innerHeight - panelHeight - 8);
      setPanelPos({ top, left: rect.right + 8 });
    }
    setOpen(o => !o);
  };

  const handleSelect = (theme) => {
    setActiveId(theme.id);
    applyTheme(theme);
    setOpen(false);
  };

  const panel = open && typeof document !== "undefined" && createPortal(
    <div
      id="tt-theme-panel"
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
      className="w-56 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 p-3"
    >
      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 px-1">Theme</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => handleSelect(theme)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
              activeId === theme.id
                ? "bg-white/10 ring-1 ring-white/30"
                : "hover:bg-white/5"
            }`}
            title={theme.label}
          >
            <div
              className="w-8 h-8 rounded-full shadow-lg"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${theme.accent}, ${theme.accent}66)`,
                boxShadow: activeId === theme.id ? `0 0 12px ${theme.accent}88` : undefined,
              }}
            />
            <span className="text-[10px] text-neutral-300 font-medium">{theme.label}</span>
          </button>
        ))}
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
            ? "bg-[#181818] text-green-400 rounded-[16px]"
            : "bg-[#181818] text-neutral-400 hover:bg-white/10 hover:text-white hover:rounded-[16px]"
        }`}
        title="Change Theme"
      >
        <Palette className="w-6 h-6" />
      </button>
      {panel}
    </div>
  );
}
