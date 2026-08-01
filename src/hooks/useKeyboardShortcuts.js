"use client";

import { useEffect, useCallback } from "react";

/**
 * Keyboard shortcuts for Tune Together
 *
 * Shortcuts:
 * - Space: Play/Pause (when not focused on input)
 * - Left Arrow: Seek back 5s
 * - Right Arrow: Seek forward 5s
 * - Shift + Left/Right: Prev/Next track
 * - / or Ctrl+K: Focus search
 * - M: Mute/Unmute
 * - Q: Open queue panel
 * - L: Toggle lyrics
 * - ?: Show shortcuts help
 * - Escape: Close modals/overlays
 */

const SHORTCUTS = {
  PLAY_PAUSE: "space",
  SEEK_BACK: "arrowleft",
  SEEK_FORWARD: "arrowright",
  PREV_TRACK: "shift+arrowleft",
  NEXT_TRACK: "shift+arrowright",
  FOCUS_SEARCH: ["slash", "k+ctrl", "k+meta"],
  MUTE: "m",
  QUEUE: "q",
  LYRICS: "l",
  HELP: "?",
  ESCAPE: "escape",
};

export function useKeyboardShortcuts({
  onPlayPause,
  onSeek,
  onNext,
  onPrev,
  onMuteToggle,
  onFocusSearch,
  onToggleQueue,
  onToggleLyrics,
  onShowHelp,
  onCloseModal,
  enabled = true,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Ignore if typing in input/textarea (except for specific shortcuts)
      const isTyping =
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.isContentEditable;

      const key = e.key.toLowerCase();
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey || e.metaKey;

      // Escape always works
      if (key === "escape") {
        onCloseModal?.();
        return;
      }

      // Focus search works even when typing
      if ((key === "/" && !isShift) || (key === "k" && isCtrl)) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Don't process other shortcuts while typing
      if (isTyping) return;

      // Play/Pause
      if (key === " " || key === "spacebar") {
        e.preventDefault();
        onPlayPause?.();
        return;
      }

      // Seek / Prev/Next
      if (key === "arrowleft") {
        e.preventDefault();
        if (isShift) {
          onPrev?.();
        } else {
          onSeek?.(-5);
        }
        return;
      }

      if (key === "arrowright") {
        e.preventDefault();
        if (isShift) {
          onNext?.();
        } else {
          onSeek?.(5);
        }
        return;
      }

      // Mute
      if (key === "m") {
        e.preventDefault();
        onMuteToggle?.();
        return;
      }

      // Queue
      if (key === "q") {
        e.preventDefault();
        onToggleQueue?.();
        return;
      }

      // Lyrics
      if (key === "l") {
        e.preventDefault();
        onToggleLyrics?.();
        return;
      }

      // Help
      if (key === "?" || (key === "/" && isShift)) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    },
    [
      enabled,
      onPlayPause,
      onSeek,
      onNext,
      onPrev,
      onMuteToggle,
      onFocusSearch,
      onToggleQueue,
      onToggleLyrics,
      onShowHelp,
      onCloseModal,
    ]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Help modal component showing all shortcuts
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["Space"], description: "Play / Pause" },
    { keys: ["←", "→"], description: "Seek back / forward 5s" },
    { keys: ["Shift + ←", "Shift + →"], description: "Previous / Next track" },
    { keys: ["M"], description: "Mute / Unmute" },
    { keys: ["/", "Ctrl + K"], description: "Focus search" },
    { keys: ["Q"], description: "Toggle queue panel" },
    { keys: ["L"], description: "Toggle lyrics view" },
    { keys: ["?"], description: "Show this help" },
    { keys: ["Esc"], description: "Close modals" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#181818] rounded-xl shadow-2xl overflow-hidden animate-fade-up">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">⌨️</span> Keyboard Shortcuts
          </h2>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar">
          <div className="space-y-2">
            {shortcuts.map((shortcut, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-neutral-300 text-sm">
                  {shortcut.description}
                </span>
                <div className="flex gap-1.5">
                  {shortcut.keys.map((key, keyIdx) => (
                    <kbd
                      key={keyIdx}
                      className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-mono text-white shadow-sm"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export { SHORTCUTS };
