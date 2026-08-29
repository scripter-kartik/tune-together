"use client";

import { useState, useEffect, useCallback } from "react";


const CLAMP = 15;

function storageKey(songId) {
  return `tt-lyrics-offset-${songId}`;
}

export function useLyricsOffset(songId) {
  const [offset, setOffsetState] = useState(0);

  
  useEffect(() => {
    if (!songId) {
      setOffsetState(0);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(songId));
      setOffsetState(raw ? parseFloat(raw) || 0 : 0);
    } catch {
      setOffsetState(0);
    }
  }, [songId]);

  const persist = useCallback((value, id) => {
    try {
      if (value === 0) localStorage.removeItem(storageKey(id));
      else localStorage.setItem(storageKey(id), String(value));
    } catch {}
  }, []);

  const setOffset = useCallback(
    (value) => {
      const next = Math.max(-CLAMP, Math.min(CLAMP, Math.round(value * 2) / 2));
      setOffsetState(next);
      persist(next, songId);
    },
    [songId, persist]
  );

  
  const adjust = useCallback(
    (delta) => {
      setOffsetState((prev) => {
        const next = Math.max(-CLAMP, Math.min(CLAMP, Math.round((prev + delta) * 2) / 2));
        persist(next, songId);
        return next;
      });
    },
    [songId, persist]
  );

  const reset = useCallback(() => {
    setOffsetState(0);
    persist(0, songId);
  }, [songId, persist]);

  return { offset, setOffset, adjust, reset };
}
