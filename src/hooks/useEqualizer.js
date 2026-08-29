"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const STORAGE_KEY = "tt-eq";

export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [6, 5, 4, 2.5, 1, 0, 0, 0, 0, 0],
  Rock: [5, 3, 1, -1, -1, -1, 1, 3, 4, 4],
  Pop: [-1, 1, 2, 3, 2, 1, -1, -1, 2, 3],
  Jazz: [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
  Vocal: [-2, -2, -1, 0, 2, 3, 3, 2, 1, 1],
  "Treble Boost": [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
  Electronic: [5, 4, 3, 1, -1, -1, 0, 2, 4, 5],
};

const DEFAULT_EFFECTS = {
  bassBoost: 0,
  spatial: 0,
  nightMode: false,
  loudness: false,
};

function readStored() {
  if (typeof window === "undefined")
    return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw) return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
    const gains =
      Array.isArray(raw.gains) && raw.gains.length === BANDS.length
        ? raw.gains
        : EQ_PRESETS.Flat;
    return { gains, effects: { ...DEFAULT_EFFECTS, ...(raw.effects || {}) } };
  } catch {
    return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
  }
}

// Track which elements have already been sourced into the Web Audio graph.
// MediaElementSource can only be created ONCE per element — creating it a second
// time throws "InvalidStateError". We use a module-level WeakMap so it survives
// React strict-mode double-mounts and component re-renders.
const wiredElements = new WeakMap(); // element → AudioNode (the source node)

export function useEqualizer({ playerRef }) {
  const [settings, setSettings] = useState({
    gains: EQ_PRESETS.Flat,
    effects: DEFAULT_EFFECTS,
  });
  const [wired, setWired] = useState(false);

  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const filtersRef = useRef([]);
  const masterRef = useRef(null);
  const bassRef = useRef(null);
  const spatialRef = useRef(null);
  const makeupRef = useRef(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Hydrate persisted settings on mount.
  useEffect(() => {
    setSettings(readStored());
  }, []);

  // Lazy-create the audio graph. Called from a user gesture so AudioContext
  // starts in "running" state (browser autoplay policy).
  const ensureGraph = useCallback(() => {
    // Reuse existing non-closed context.
    if (ctxRef.current) {
      if (ctxRef.current.state !== "closed") return ctxRef.current;
      // Closed context (e.g. strict-mode cleanup) — reset so we rebuild.
      ctxRef.current = null;
      filtersRef.current = [];
      masterRef.current = null;
      bassRef.current = null;
      spatialRef.current = null;
      makeupRef.current = null;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();

      // Dynamics compressor to prevent clipping when EQ boosts are applied.
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 20;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const makeup = ctx.createGain();
      makeup.gain.value = 1;

      const master = ctx.createGain();
      master.gain.value = 1;

      // 10-band EQ. First/last bands use shelving for a natural response.
      const filters = BANDS.map((freq, i) => {
        const f = ctx.createBiquadFilter();
        f.frequency.value = freq;
        f.Q.value = 1.1;
        if (i === 0) f.type = "lowshelf";
        else if (i === BANDS.length - 1) f.type = "highshelf";
        else f.type = "peaking";
        f.gain.value = settingsRef.current.gains[i] || 0;
        return f;
      });

      // Extra bass-boost shelf (separate from the 31 Hz EQ band).
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 120;
      bass.gain.value = settingsRef.current.effects.bassBoost || 0;

      // Optional stereo panner for the "3D / spatial" effect.
      let spatial = null;
      if (typeof ctx.createStereoPanner === "function") {
        spatial = ctx.createStereoPanner();
        spatial.pan.value = 0;
      }

      // Chain: filters → bass → [spatial →] master → compressor → makeup → out
      for (let i = 0; i < filters.length - 1; i++)
        filters[i].connect(filters[i + 1]);
      filters[filters.length - 1].connect(bass);
      if (spatial) bass.connect(spatial);
      (spatial || bass).connect(master);
      master.connect(compressor);
      compressor.connect(makeup);
      makeup.connect(ctx.destination);

      ctxRef.current = ctx;
      filtersRef.current = filters;
      masterRef.current = master;
      bassRef.current = bass;
      spatialRef.current = spatial;
      makeupRef.current = makeup;
      return ctx;
    } catch (err) {
      console.warn("EQ: could not create audio graph:", err);
      return null;
    }
  }, []);

  // Wire the player's media element into the graph.
  // Safe to call repeatedly — already-wired elements are detected via the
  // module-level WeakMap and reconnected without creating a new source node.
  const wirePlayer = useCallback(() => {
    try {
      // Unwrap react-player's internal player to the raw HTMLMediaElement.
      let mediaElement = playerRef.current?.getInternalPlayer?.();
      if (mediaElement && typeof mediaElement.getInternalPlayer === "function") {
        mediaElement = mediaElement.getInternalPlayer();
      }

      if (!(mediaElement instanceof HTMLMediaElement)) {
        // YouTube iframes and other non-native sources land here — expected.
        setWired(false);
        return;
      }

      // If this exact element is already in the graph just mark as wired.
      if (wiredElements.has(mediaElement)) {
        // Re-connect source → graph head in case graph was rebuilt.
        const existingSource = wiredElements.get(mediaElement);
        if (
          existingSource &&
          filtersRef.current.length > 0 &&
          ctxRef.current &&
          ctxRef.current.state !== "closed"
        ) {
          try {
            existingSource.disconnect();
            existingSource.connect(filtersRef.current[0]);
            sourceRef.current = existingSource;
          } catch {
            // disconnect can throw if already disconnected — ignore
          }
        }
        setWired(true);
        return;
      }

      const ctx = ensureGraph();
      if (!ctx) return;

      // Resume in case browser suspended due to autoplay policy.
      ctx.resume?.().catch(() => {});

      // Disconnect the previous source node before creating a new one.
      try {
        sourceRef.current?.disconnect?.();
      } catch {}

      const source = ctx.createMediaElementSource(mediaElement);
      source.connect(filtersRef.current[0]);
      sourceRef.current = source;
      wiredElements.set(mediaElement, source);

      setWired(true);
    } catch (err) {
      console.warn("EQ: could not wire audio source:", err);
      setWired(false);
    }
  }, [ensureGraph, playerRef]);

  // Apply all gains smoothly whenever settings change.
  useEffect(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") return;
    try {
      const t = ctxRef.current.currentTime;
      filtersRef.current.forEach((f, i) => {
        f.gain.setTargetAtTime(settings.gains[i] || 0, t, 0.02);
      });
      bassRef.current?.gain.setTargetAtTime(
        settings.effects.bassBoost || 0,
        t,
        0.02
      );
      if (spatialRef.current?.pan)
        spatialRef.current.pan.setTargetAtTime(
          settings.effects.spatial || 0,
          t,
          0.02
        );
      masterRef.current?.gain.setTargetAtTime(
        settings.effects.nightMode ? 0.4 : 1,
        t,
        0.05
      );
      makeupRef.current?.gain.setTargetAtTime(
        settings.effects.loudness ? 1.6 : 1,
        t,
        0.05
      );
    } catch {}
  }, [settings]);

  // Persist settings.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setGain = useCallback((band, value) => {
    setSettings((prev) => {
      const gains = [...prev.gains];
      gains[band] = value;
      return { ...prev, gains };
    });
  }, []);

  const applyPreset = useCallback((name) => {
    const preset = EQ_PRESETS[name];
    if (preset) setSettings((prev) => ({ ...prev, gains: [...preset] }));
  }, []);

  const toggleEffect = useCallback((key) => {
    setSettings((prev) => {
      if (key === "bassBoost")
        return {
          ...prev,
          effects: {
            ...prev.effects,
            bassBoost: prev.effects.bassBoost > 0 ? 0 : 6,
          },
        };
      if (key === "spatial")
        return {
          ...prev,
          effects: {
            ...prev.effects,
            spatial: prev.effects.spatial > 0 ? 0 : 0.4,
          },
        };
      if (key === "nightMode")
        return {
          ...prev,
          effects: { ...prev.effects, nightMode: !prev.effects.nightMode },
        };
      if (key === "loudness")
        return {
          ...prev,
          effects: { ...prev.effects, loudness: !prev.effects.loudness },
        };
      return prev;
    });
  }, []);

  const resetAll = useCallback(() => {
    setSettings({ gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS });
  }, []);

  // Cleanup on unmount — close the AudioContext and null all refs so that
  // React 18 strict-mode double-mounts don't reuse a closed context.
  useEffect(() => {
    return () => {
      try {
        if (ctxRef.current && ctxRef.current.state !== "closed") {
          ctxRef.current.close();
        }
      } catch {}
      ctxRef.current = null;
      sourceRef.current = null;
      filtersRef.current = [];
      masterRef.current = null;
      bassRef.current = null;
      spatialRef.current = null;
      makeupRef.current = null;
      setWired(false);
    };
  }, []);

  const isActive =
    settings.gains.some((g) => g !== 0) ||
    settings.effects.bassBoost > 0 ||
    settings.effects.spatial > 0 ||
    settings.effects.nightMode ||
    settings.effects.loudness;

  return {
    settings,
    wired,
    bands: BANDS,
    wirePlayer,
    setGain,
    applyPreset,
    toggleEffect,
    resetAll,
    isActive,
  };
}
