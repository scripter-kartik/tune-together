"use client";

import { useState, useEffect, useCallback, useRef } from "react";


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
  const [timer, setTimer] = useState(null); 
  const [remainingMs, setRemainingMs] = useState(null);
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  
  useEffect(() => {
    setTimer(readStored());
  }, []);

  
  useEffect(() => {
    if (!timer) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setRemainingMs(null);
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timer)); } catch {}
  }, [timer]);

  
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

export function formatRemaining(ms) {
  if (ms == null || ms < 0) return "";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
