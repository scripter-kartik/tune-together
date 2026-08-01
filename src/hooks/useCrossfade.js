"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Crossfade between tracks.
 *
 * True overlapping playback isn't possible with a single YouTube source, so
 * this implements a professional fade: the outgoing track fades down over the
 * last N seconds and the incoming track fades up over its first N seconds.
 * The duration is persisted in localStorage.
 */

const STORAGE_KEY = "tt-crossfade";

export const CROSSFADE_PRESETS = [0, 2, 3, 4, 5, 8, 10, 12];

function readStored() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = parseFloat(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  } catch {
    return 0;
  }
}

export function useCrossfade({ playerRef, duration, isPlaying, song }) {
  const [fadeSeconds, setFadeSeconds] = useState(0);
  const [fadeFactor, setFadeFactor] = useState(1);

  // Hydrate persisted setting after mount.
  useEffect(() => {
    setFadeSeconds(readStored());
  }, []);

  const setCrossfade = useCallback((seconds) => {
    const next = Math.max(0, seconds);
    setFadeSeconds(next);
    try {
      if (next === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  }, []);

  // Smooth rAF-driven fade factor based on playhead position.
  useEffect(() => {
    if (!isPlaying || !song || fadeSeconds <= 0 || !playerRef.current) {
      setFadeFactor(1);
      return;
    }

    let raf;
    const tick = () => {
      const pos = playerRef.current?.getCurrentTime?.() || 0;
      const dur = duration || 0;
      let factor = 1;

      if (dur > 0) {
        const remaining = dur - pos;
        if (remaining <= fadeSeconds && remaining >= 0) {
          // Fade out over the tail of the track.
          factor = fadeSeconds > 0 ? Math.max(0, remaining / fadeSeconds) : 1;
        } else if (pos < fadeSeconds) {
          // Fade in over the head of the track.
          factor = Math.min(1, pos / fadeSeconds);
        }
      }

      // Smooth out jitter with a small lerp toward the target.
      setFadeFactor((prev) => (Math.abs(prev - factor) < 0.02 ? factor : prev * 0.6 + factor * 0.4));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, song, fadeSeconds, duration, playerRef]);

  return { fadeSeconds, setCrossfade, fadeFactor, crossfadeOn: fadeSeconds > 0 };
}
