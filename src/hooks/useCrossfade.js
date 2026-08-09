"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Crossfade between tracks.
 *
 * True overlapping playback isn't possible with a single audio source, so this
 * implements a professional fade: the outgoing track fades down over the last
 * N seconds and the incoming track fades up over its first N seconds. The
 * duration is persisted in localStorage.
 *
 * The factor is eased toward a target each animation frame but only pushed to
 * React state when it actually changes, so the player doesn't re-render
 * 60×/second while a track plays steadily.
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
  const factorRef = useRef(1);
  const lastAppliedRef = useRef(1);

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

  // A new track always starts faded out, so it fades in from silence instead
  // of carrying over the previous track's factor (e.g. after skipping
  // mid-song).
  useEffect(() => {
    factorRef.current = 0;
    lastAppliedRef.current = 0;
    setFadeFactor(0);
  }, [song?.id]);

  // Smooth rAF-driven fade factor based on playhead position.
  useEffect(() => {
    if (!isPlaying || !song || fadeSeconds <= 0) {
      factorRef.current = 1;
      lastAppliedRef.current = 1;
      setFadeFactor(1);
      return;
    }

    let raf;
    const tick = () => {
      const pos = playerRef.current?.getCurrentTime?.() || 0;
      const dur = duration || 0;
      let target = 1;

      if (dur > 0) {
        const remaining = dur - pos;
        if (remaining <= fadeSeconds && remaining >= 0) {
          // Fade out over the tail of the track.
          target = fadeSeconds > 0 ? Math.max(0, remaining / fadeSeconds) : 1;
        } else if (pos < fadeSeconds) {
          // Fade in over the head of the track.
          target = Math.min(1, pos / fadeSeconds);
        }
      } else {
        // Duration unknown yet (buffering) — hold at the fade-in position so
        // a fresh track stays quiet until it actually starts.
        target = Math.min(1, pos / fadeSeconds);
      }

      // Ease toward the target; only re-render when it meaningfully changes.
      factorRef.current += (target - factorRef.current) * 0.3;
      if (Math.abs(factorRef.current - lastAppliedRef.current) > 0.004) {
        lastAppliedRef.current = factorRef.current;
        setFadeFactor(factorRef.current);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, song, fadeSeconds, duration, playerRef]);

  return { fadeSeconds, setCrossfade, fadeFactor, crossfadeOn: fadeSeconds > 0 };
}
