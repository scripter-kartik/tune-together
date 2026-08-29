"use client";

import { useState, useEffect, useCallback, useRef } from "react";


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

  
  
  
  useEffect(() => {
    factorRef.current = 0;
    lastAppliedRef.current = 0;
    setFadeFactor(0);
  }, [song?.id]);

  
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
          
          target = fadeSeconds > 0 ? Math.max(0, remaining / fadeSeconds) : 1;
        } else if (pos < fadeSeconds) {
          
          target = Math.min(1, pos / fadeSeconds);
        }
      } else {
        
        
        target = Math.min(1, pos / fadeSeconds);
      }

      
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
