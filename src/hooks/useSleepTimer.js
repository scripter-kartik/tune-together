"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Sleep timer hook.
 *
 * Modes:
 * - { type: "timer", endsAt: number }        — pause at an absolute wall-clock time
 * - { type: "track", trackId: string }        — pause when the current track ends
 * - { type: "queue" }                          — pause when the queue is exhausted
 *
 * When the timer fires, it dispatches a `tt-sleep-timer-fired` custom event
 * so the player can pause (and the room stays in sync). The setting is
 * persisted to localStorage so it survives navigation.
 */

const STORAGE_KEY = "tt-sleep-timer";

function readStored() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.type === "timer" && parsed.endsAt > Date.now()) return parsed;
    if (parsed.type === "track" || parsed.type === "queue") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function useSleepTimer({ onFire, currentSongId = null, queueLength = 0 } = {}) {
  const [timer, setTimer] = useState(null); // { type, endsAt?, trackId? }
  const [remainingMs, setRemainingMs] = useState(null);
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  // Load persisted state once.
  useEffect(() => {
    setTimer(readStored());
  }, []);

  // Persist whenever the timer changes.
  useEffect(() => {
    if (!timer) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setRemainingMs(null);
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timer)); } catch {}
  }, [timer]);

  // Countdown ticker — only meaningful for timer mode.
  useEffect(() => {
    if (!timer || timer.type !== "timer") return;
    const tick = () => {
      const left = timer.endsAt - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setTimer(null);
        onFireRef.current?.();
      } else {
        setRemainingMs(left);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer]);

  const setSleepTimer = useCallback((minutes) => {
    setTimer(minutes > 0 ? { type: "timer", endsAt: Date.now() + minutes * 60 * 1000 } : null);
  }, []);

  const setEndOfTrack = useCallback(() => {
    setTimer({ type: "track", trackId: currentSongId ?? null });
  }, [currentSongId]);

  const setEndOfQueue = useCallback(() => {
    setTimer({ type: "queue" });
  }, []);

  const clearSleepTimer = useCallback(() => setTimer(null), []);

  // Track mode: pause when the playing song changes away from the tracked one.
  const trackedIdRef = useRef(null);
  useEffect(() => {
    if (timer?.type === "track") trackedIdRef.current = timer.trackId;
    else trackedIdRef.current = null;
  }, [timer]);

  useEffect(() => {
    if (timer?.type !== "track") return;
    if (trackedIdRef.current && currentSongId && currentSongId !== trackedIdRef.current) {
      onFireRef.current?.();
      setTimer(null);
    }
  }, [currentSongId, timer]);

  // Queue mode: pause when the queue drains. Only fires when the queue goes
  // from non-empty to 0 (tracking the previous length), so selecting it while
  // the queue is already empty doesn't pause mid-song immediately.
  const prevQueueLengthRef = useRef(queueLength);
  useEffect(() => {
    const prev = prevQueueLengthRef.current;
    prevQueueLengthRef.current = queueLength;
    if (timer?.type !== "queue") return;
    if (prev > 0 && queueLength === 0) {
      onFireRef.current?.();
      setTimer(null);
    }
  }, [queueLength, timer]);

  return {
    timer,
    remainingMs,
    isActive: !!timer,
    setSleepTimer,
    setEndOfTrack,
    setEndOfQueue,
    clearSleepTimer,
  };
}

/** Format milliseconds as "12m 30s" or "12:30". */
export function formatRemaining(ms) {
  if (ms == null || ms < 0) return "";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
