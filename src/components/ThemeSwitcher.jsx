"use client";

import { useState, useEffect, useRef } from "react";
import { Palette, Check } from "lucide-react";
import { createPortal } from "react-dom";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEMES,
  getThemeById,
  getThemeVars,
} from "@/lib/themes";

function applyTheme(theme) {
  const root = document.documentElement;
  const vars = getThemeVars(theme);
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.dataset.theme = theme.id;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", theme.rail);

  try { localStorage.setItem(THEME_STORAGE_KEY, theme.id); } catch {}
}

export function getStoredThemeId() {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID; } catch { return DEFAULT_THEME_ID; }
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("green");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    const theme = getThemeById(getStoredThemeId());
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
      const panelHeight = 368;
      const panelWidth = 272;
      const top = Math.min(rect.top, window.innerHeight - panelHeight - 8);
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

  const activeTheme = getThemeById(activeId);

  const panel = open && typeof document !== "undefined" && createPortal(
    <div
      id="tt-theme-panel"
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
      className="w-64 overflow-hidden rounded-xl border border-white/[0.1] bg-[#181818] shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
    >
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.07]">
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Theme</p>
        <p className="text-white text-sm font-semibold mt-0.5">{activeTheme.label}</p>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {THEMES.map(theme => {
          const isActive = activeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={`relative overflow-hidden rounded-lg border p-2.5 text-left transition-all duration-200 ${
                isActive
                  ? "border-white/25 ring-1 ring-white/20"
                  : "border-white/5 hover:border-white/15"
              }`}
              title={theme.label}
              style={{
                background: `linear-gradient(135deg, ${theme.elevated}, ${theme.surface} 58%, ${theme.bg})`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-10 opacity-80"
                style={{
                  background: `linear-gradient(90deg, ${theme.accent}55, ${theme.accent2}33, transparent)`,
                }}
              />
              <div className="relative flex items-center justify-between">
                <span
                  className="h-8 w-8 rounded-full border border-white/10"
                  style={{
                    background: `conic-gradient(from 180deg, ${theme.accent}, ${theme.accent2}, ${theme.hover}, ${theme.accent})`,
                    boxShadow: `0 8px 20px ${theme.accent}33`,
                  }}
                />
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent2 }} />
                </span>
              </div>
              <span className="relative mt-3 block text-xs font-bold text-white">
                {theme.label}
              </span>
              {isActive && (
                <div
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Check className="h-3 w-3 text-black" strokeWidth={3} />
                </div>
              )}
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
          background: open
            ? `linear-gradient(135deg, ${activeTheme.accent}24, var(--tt-surface-elevated))`
            : "var(--tt-surface)",
          boxShadow: open ? `0 0 0 1px ${activeTheme.accent}55` : "none",
          color: open ? activeTheme.accent : "#9ca3af",
        }}
        title="Change Theme"
        aria-label="Change theme"
      >
        <Palette className="w-5 h-5" />
      </button>
      {panel}
    </div>
  );
}
