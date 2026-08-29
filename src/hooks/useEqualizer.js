"use client";

import { useState, useEffect, useCallback, useRef } from "react";


const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const STORAGE_KEY = "tt-eq";

export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [6, 5, 4, 2.5, 1, 0, 0, 0, 0, 0],
  "Rock": [5, 3, 1, -1, -1, -1, 1, 3, 4, 4],
  "Pop": [-1, 1, 2, 3, 2, 1, -1, -1, 2, 3],
  "Jazz": [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
  "Vocal": [-2, -2, -1, 0, 2, 3, 3, 2, 1, 1],
  "Treble Boost": [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
  "Electronic": [5, 4, 3, 1, -1, -1, 0, 2, 4, 5],
};

const DEFAULT_EFFECTS = { bassBoost: 0, spatial: 0, nightMode: false, loudness: false };

function readStored() {
  if (typeof window === "undefined") return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw) return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
    const gains = Array.isArray(raw.gains) && raw.gains.length === BANDS.length ? raw.gains : EQ_PRESETS.Flat;
    return { gains, effects: { ...DEFAULT_EFFECTS, ...(raw.effects || {}) } };
  } catch {
    return { gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS };
  }
}


const EQ_DEBUG = false; 


const elementTracking = {
  wiredElements: new WeakSet(),
  wiredCount: 0,
  failedElements: new WeakMap(), 
  lastWiredElement: null,
  lastWiredTime: 0,
  lastFailedElement: null,
  lastFailedTime: 0,
  lastFailedError: null,
};

function logDebug(...args) {
  if (EQ_DEBUG) {
    console.log('[EQ DEBUG]', ...args);
  }
}

function logError(...args) {
  console.error('[EQ ERROR]', ...args);
}

function logWarn(...args) {
  console.warn('[EQ WARN]', ...args);
}

export function useEqualizer({ playerRef }) {
  const [settings, setSettings] = useState({ gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS });
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

  
  useEffect(() => {
    setSettings(readStored());
  }, []);

  
  
  
  
  const ensureGraph = useCallback(() => {
    logDebug('=== START ensureGraph() ===');

    
    if (ctxRef.current) {
      logDebug('Step 1 - Existing AudioContext found:', {
        state: ctxRef.current.state,
        sampleRate: ctxRef.current.sampleRate,
        currentTime: ctxRef.current.currentTime,
      });

      if (ctxRef.current.state !== "closed") {
        logDebug('Step 1 - Returning existing (non-closed) context');
        logDebug('=== END ensureGraph() - Reused existing context ===');
        return ctxRef.current;
      }

      
      
      logDebug('Step 1 - Context is closed, resetting refs');
      ctxRef.current = null;
      filtersRef.current = [];
      masterRef.current = null;
      bassRef.current = null;
      spatialRef.current = null;
      makeupRef.current = null;
    } else {
      logDebug('Step 1 - No existing AudioContext found');
    }

    try {
      
      logDebug('Step 2 - Checking Web Audio API availability');
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      logDebug('Step 2 - Web Audio API:', {
        available: !!AudioCtx,
        isAudioContext: AudioCtx === window.AudioContext,
        isWebkitAudioContext: AudioCtx === window.webkitAudioContext,
      });

      if (!AudioCtx) {
        logError('Step 2 - Web Audio API not available in this browser');
        logDebug('=== END ensureGraph() - Web Audio API not available ===');
        return null;
      }

      
      logDebug('Step 3 - Creating new AudioContext');
      const ctx = new AudioCtx();
      logDebug('Step 3 - AudioContext created:', {
        state: ctx.state,
        sampleRate: ctx.sampleRate,
        currentTime: ctx.currentTime,
        baseLatency: ctx.baseLatency,
      });

      
      logDebug('Step 4 - Creating dynamics compressor');
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 20;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      
      logDebug('Step 5 - Creating makeup gain');
      const makeup = ctx.createGain();
      makeup.gain.value = 1;

      
      logDebug('Step 6 - Creating master gain');
      const master = ctx.createGain();
      master.gain.value = 1;

      
      logDebug('Step 7 - Creating 10-band EQ filters');
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

      
      logDebug('Step 8 - Creating bass boost shelf');
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 120;
      bass.gain.value = settingsRef.current.effects.bassBoost || 0;

      
      logDebug('Step 9 - Checking spatial panner availability');
      let spatial = null;
      if (typeof ctx.createStereoPanner === "function") {
        logDebug('Step 9 - Creating stereo panner');
        spatial = ctx.createStereoPanner();
        spatial.pan.value = 0;
      } else {
        logDebug('Step 9 - StereoPanner not available in this browser');
      }

      
      logDebug('Step 10 - Connecting nodes: filters → bass → spatial → master → compressor → makeup');
      for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
      filters[filters.length - 1].connect(bass);
      if (spatial) bass.connect(spatial);
      (spatial || bass).connect(master);
      master.connect(compressor);
      compressor.connect(makeup);
      makeup.connect(ctx.destination);

      
      logDebug('Step 11 - Storing references');
      ctxRef.current = ctx;
      filtersRef.current = filters;
      masterRef.current = master;
      bassRef.current = bass;
      spatialRef.current = spatial;
      makeupRef.current = makeup;

      logDebug('Step 11 - Audio graph created successfully:', {
        filtersCount: filters.length,
        hasSpatial: !!spatial,
        masterGain: master.gain.value,
        makeupGain: makeup.gain.value,
      });

      logDebug('=== END ensureGraph() - Success ===');
      return ctx;

    } catch (err) {
      logError('Step X - EXCEPTION in ensureGraph():', err);
      logError('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      logDebug('=== END ensureGraph() - Exception ===');
      return null;
    }
  }, []);

  
  
  const wirePlayer = useCallback(() => {
    logDebug('=== START wirePlayer() ===');

    try {
      
      const internal = playerRef.current?.getInternalPlayer?.();
      logDebug('Step 1 - getInternalPlayer() returned:', {
        internal,
        constructor: internal?.constructor?.name,
        tagName: internal?.tagName,
        currentSrc: internal?.currentSrc?.slice(0, 100),
        hasGetInternalPlayer: typeof internal?.getInternalPlayer === 'function',
        playerRefExists: !!playerRef.current,
      });

      
      let mediaElement = internal;
      if (mediaElement && typeof mediaElement.getInternalPlayer === "function") {
        mediaElement = mediaElement.getInternalPlayer();
        logDebug('Step 2 - unwrapped to:', {
          mediaElement,
          constructor: mediaElement?.constructor?.name,
          tagName: mediaElement?.tagName,
          isHTMLMediaElement: mediaElement instanceof HTMLMediaElement,
        });
      }

      
      if (!(mediaElement instanceof HTMLMediaElement)) {
        
        logDebug('Step 3 - NOT a HTMLMediaElement (expected for previews/YouTube):', {
          mediaElement,
          constructor: mediaElement?.constructor?.name,
        });

        elementTracking.lastFailedElement = mediaElement;
        elementTracking.lastFailedTime = Date.now();
        elementTracking.lastFailedError = new Error('Not a HTMLMediaElement');
        elementTracking.failedElements.set(mediaElement, {
          error: 'Not a HTMLMediaElement',
          time: Date.now(),
          constructor: mediaElement?.constructor?.name,
        });

        setWired(false);
        logDebug('=== END wirePlayer() - Not a media element ===');
        return;
      }

      
      const alreadyWired = elementTracking.wiredElements.has(mediaElement);
      logDebug('Step 4 - WeakSet check:', {
        mediaElement,
        alreadyWired,
        wiredElementsCount: elementTracking.wiredCount,
        lastWiredElement: elementTracking.lastWiredElement,
        lastWiredTime: elementTracking.lastWiredTime,
      });

      if (alreadyWired) {
        logDebug('Element already in WeakSet, marking as wired');
        setWired(true);
        logDebug('=== END wirePlayer() - Already wired ===');
        return;
      }

      
      logDebug('Step 5 - Calling ensureGraph()');
      const ctx = ensureGraph();
      if (!ctx) {
        logError('Step 5 - ensureGraph() returned null/undefined');
        setWired(false);
        logDebug('=== END wirePlayer() - No audio context ===');
        return;
      }

      
      logDebug('Step 6 - AudioContext state:', {
        state: ctx.state,
        sampleRate: ctx.sampleRate,
        currentTime: ctx.currentTime,
      });

      
      if (ctx.state === 'suspended') {
        logDebug('Step 7 - Resuming suspended AudioContext');
        ctx.resume().catch(err => {
          logError('Failed to resume AudioContext:', err);
        });
      }

      
      if (sourceRef.current) {
        logDebug('Step 8 - Disconnecting previous source');
        sourceRef.current.disconnect();
      }

      
      logDebug('Step 9 - Creating MediaElementSource');
      const source = ctx.createMediaElementSource(mediaElement);
      source.connect(filtersRef.current[0]);
      sourceRef.current = source;

      
      elementTracking.wiredElements.add(mediaElement);
      elementTracking.wiredCount++;
      elementTracking.lastWiredElement = mediaElement;
      elementTracking.lastWiredTime = Date.now();

      
      elementTracking.failedElements.delete(mediaElement);

      
      setWired(true);
      logDebug('Step 11 - SUCCESS - Wired audio element:', {
        tagName: mediaElement.tagName,
        currentSrc: mediaElement.currentSrc?.slice(0, 100),
        duration: mediaElement.duration,
        readyState: mediaElement.readyState,
        networkState: mediaElement.networkState,
        audioContextState: ctx.state,
        wiredElementsCount: elementTracking.wiredCount,
      });

      logDebug('=== END wirePlayer() - Success ===');

    } catch (err) {
      logError('Step X - EXCEPTION in wirePlayer():', err);
      logError('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      elementTracking.lastFailedElement = mediaElement;
      elementTracking.lastFailedTime = Date.now();
      elementTracking.lastFailedError = err;

      if (mediaElement) {
        elementTracking.failedElements.set(mediaElement, {
          error: err.message,
          time: Date.now(),
          stack: err.stack,
        });
      }

      setWired(false);
      logDebug('=== END wirePlayer() - Exception ===');
    }
  }, [ensureGraph, playerRef]);

  
  useEffect(() => {
    if (!ctxRef.current) return;
    try {
      
      if (ctxRef.current.state === "closed") return;
      const t = ctxRef.current.currentTime;
      filtersRef.current.forEach((f, i) => {
        const g = settings.gains[i] || 0;
        f.gain.setTargetAtTime(g, t, 0.02);
      });
      bassRef.current?.gain.setTargetAtTime(settings.effects.bassBoost || 0, t, 0.02);
      if (spatialRef.current?.pan) spatialRef.current.pan.setTargetAtTime(settings.effects.spatial || 0, t, 0.02);
      masterRef.current?.gain.setTargetAtTime(settings.effects.nightMode ? 0.4 : 1, t, 0.05);
      makeupRef.current?.gain.setTargetAtTime(settings.effects.loudness ? 1.6 : 1, t, 0.05);
    } catch {}
  }, [settings]);

  
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
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
      if (key === "bassBoost") {
        return { ...prev, effects: { ...prev.effects, bassBoost: prev.effects.bassBoost > 0 ? 0 : 6 } };
      }
      if (key === "spatial") {
        return { ...prev, effects: { ...prev.effects, spatial: prev.effects.spatial > 0 ? 0 : 0.4 } };
      }
      if (key === "nightMode") {
        return { ...prev, effects: { ...prev.effects, nightMode: !prev.effects.nightMode } };
      }
      if (key === "loudness") {
        return { ...prev, effects: { ...prev.effects, loudness: !prev.effects.loudness } };
      }
      return prev;
    });
  }, []);

  const resetAll = useCallback(() => {
    setSettings({ gains: EQ_PRESETS.Flat, effects: DEFAULT_EFFECTS });
  }, []);

  
  
  useEffect(() => {
    return () => {
      logDebug('=== Cleanup effect triggered ===');

      try {
        if (ctxRef.current && ctxRef.current.state !== "closed") {
          logDebug('Closing AudioContext:', {
            state: ctxRef.current.state,
            sampleRate: ctxRef.current.sampleRate,
          });
          ctxRef.current.close();
          logDebug('AudioContext closed');
        } else if (ctxRef.current) {
          logDebug('AudioContext already closed, state:', ctxRef.current.state);
        } else {
          logDebug('No AudioContext to close');
        }
      } catch (err) {
        logError('Error closing AudioContext:', err);
      }

      
      logDebug('Resetting all refs');
      ctxRef.current = null;
      sourceRef.current = null;
      filtersRef.current = [];
      masterRef.current = null;
      bassRef.current = null;
      spatialRef.current = null;
      makeupRef.current = null;

      
      setWired(false);
      logDebug('Cleanup complete');
    };
  }, []);

  
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000; 

  const retryWiring = useCallback(() => {
    if (retryCount >= maxRetries) {
      logDebug('Max retries reached:', retryCount);
      return;
    }

    logDebug('Scheduling retry attempt:', retryCount + 1, 'of', maxRetries);
    setRetryCount(prev => prev + 1);

    setTimeout(() => {
      logDebug('Executing retry attempt:', retryCount + 1);
      wirePlayer();
    }, retryDelay * (retryCount + 1)); 
  }, [retryCount, wirePlayer]);

  
  useEffect(() => {
    setRetryCount(0);
  }, [playerRef]);

  
  const isActive =
    settings.gains.some((g) => g !== 0) ||
    settings.effects.bassBoost > 0 ||
    settings.effects.spatial > 0 ||
    settings.effects.nightMode ||
    settings.effects.loudness;

  
  const getDiagnostics = useCallback(() => {
    const diagnostics = {
      
      wired,
      retryCount,
      maxRetries,

      
      audioContext: ctxRef.current ? {
        state: ctxRef.current.state,
        sampleRate: ctxRef.current.sampleRate,
        currentTime: ctxRef.current.currentTime,
        baseLatency: ctxRef.current.baseLatency,
      } : null,

      
      refs: {
        hasAudioContext: !!ctxRef.current,
        hasSource: !!sourceRef.current,
        filtersCount: filtersRef.current.length,
        hasMaster: !!masterRef.current,
        hasBass: !!bassRef.current,
        hasSpatial: !!spatialRef.current,
        hasMakeup: !!makeupRef.current,
      },

      
      elementTracking: {
        wiredCount: elementTracking.wiredCount,
        lastWiredTime: elementTracking.lastWiredTime,
        lastFailedTime: elementTracking.lastFailedTime,
        lastFailedError: elementTracking.lastFailedError?.message,
        failedElementsCount: elementTracking.failedElements.size,
      },

      
      webAudioAPI: {
        hasAudioContext: !!window.AudioContext,
        hasWebkitAudioContext: !!window.webkitAudioContext,
        hasCreateStereoPanner: typeof window.AudioContext?.prototype?.createStereoPanner === 'function',
      },

      
      environment: {
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
      },

      
      settings: {
        gains: settings.gains,
        effects: settings.effects,
        isActive,
      },
    };

    logDebug('Diagnostics report:', diagnostics);
    return diagnostics;
  }, [wired, retryCount, settings, isActive]);

  
  const reportDiagnostics = useCallback(() => {
    const diag = getDiagnostics();
    console.group('🎛️ Equalizer Diagnostics Report');
    console.log('Basic State:', {
      wired: diag.wired,
      retryCount: diag.retryCount,
      maxRetries: diag.maxRetries,
    });
    console.log('AudioContext:', diag.audioContext);
    console.log('Component Refs:', diag.refs);
    console.log('Element Tracking:', diag.elementTracking);
    console.log('Web Audio API:', diag.webAudioAPI);
    console.log('Environment:', diag.environment);
    console.log('Settings:', diag.settings);
    console.groupEnd();
    return diag;
  }, [getDiagnostics]);

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
    
    retryWiring,
    getDiagnostics,
    reportDiagnostics,
  };
}
