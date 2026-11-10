"use client";

import { useState, useEffect, useRef } from "react";
import { Music4, Shuffle } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { resolveRoomId, joinRoomId } from "@/lib/room";
import PlayerFooter from "./PlayerFooter";
import MobileTabBar from "./MobileTabBar";
import toast from "react-hot-toast";

export default function GlobalPlayer() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [roomId, setRoomId] = useState("");
  const socketRef = useRef(null);

  const currentSongRef = useRef(null);
  const playContextRef = useRef([]);
  const playContextIndexRef = useRef(-1);
  const autoplayRef = useRef(false);
  const autoplayQueueRef = useRef([]);
  const autoplayHistoryRef = useRef([]);
  const autoplayLoadingRef = useRef(false);
  // Server-issued token for the current play; sent with auto-advance requests
  // so the room only advances once when every listener's track ends together.
  const playIdRef = useRef(0);
  // Songs played before the current one, for the Previous button.
  const historyRef = useRef([]);
  const handleNextRef = useRef(null);
  // Bumped when the same song plays again back-to-back (e.g. a queued copy of
  // the current track) so the player remounts and restarts it.
  const [replayNonce, setReplayNonce] = useState(0);

  // Shuffle / repeat ("off" | "context" | "one"), remembered per browser.
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const shuffleRef = useRef(false);
  const repeatRef = useRef("off");
  // Context indexes already played while shuffling, so shuffle doesn't repeat.
  const playedIdxRef = useRef(new Set());

  useEffect(() => {
    try {
      const sh = localStorage.getItem("tt-shuffle") === "1";
      const rp = localStorage.getItem("tt-repeat");
      shuffleRef.current = sh;
      setShuffle(sh);
      if (rp === "context" || rp === "one") {
        repeatRef.current = rp;
        setRepeat(rp);
      }
    } catch {}
  }, []);

  const toggleShuffle = () => {
    const next = !shuffleRef.current;
    shuffleRef.current = next;
    playedIdxRef.current = new Set();
    setShuffle(next);
    try { localStorage.setItem("tt-shuffle", next ? "1" : "0"); } catch {}
  };

  const cycleRepeat = () => {
    const next = repeatRef.current === "off" ? "context" : repeatRef.current === "context" ? "one" : "off";
    repeatRef.current = next;
    setRepeat(next);
    try { localStorage.setItem("tt-repeat", next); } catch {}
  };

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const songKey = (s) => (s ? `${s.id}|${s._uniqueKey || ""}` : "");

  // The queue is updated here first and confirmed by the socket server's
  // sync-queue echo. Without this the UI waited on the server round trip, so
  // with an unreachable/sleeping socket server "Add to queue" did nothing.
  const queueRef = useRef([]);
  const applyQueue = (next) => {
    queueRef.current = next;
    setQueue(next);
    window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { queue: next } }));
  };
  const newQueueKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const removeQueued = (key) => {
    const cur = queueRef.current;
    const i = cur.findIndex((s) => s._uniqueKey === key || (!s._uniqueKey && s.id === key));
    if (i !== -1) applyQueue([...cur.slice(0, i), ...cur.slice(i + 1)]);
  };

  // Single place that switches the current track.
  const setSong = (next, { remember = true } = {}) => {
    const prev = currentSongRef.current;
    const changed = songKey(prev) !== songKey(next);
    if (changed && next && prev && String(next.id) === String(prev.id)) {
      setReplayNonce((n) => n + 1);
    }
    if (changed && remember && prev && next) {
      historyRef.current = [...historyRef.current.slice(-49), prev];
    }
    currentSongRef.current = next || null;
    setCurrentSong(next || null);
  };

  useEffect(() => {
    const { roomId: room } = resolveRoomId();
    setRoomId(room);

    const handleJoinRoom = (e) => {
      const detail = e.detail;
      const newRoom = typeof detail === "string" ? detail : detail?.roomId;
      const carry = typeof detail === "object" && !!detail?.carry;
      if (!newRoom) return;

      joinRoomId(newRoom);
      setRoomId(newRoom);

      if (carry) {
        const song = currentSongRef.current;
        if (song) {
          const probe = { position: 0 };
          window.dispatchEvent(new CustomEvent("tt-get-position", { detail: probe }));
          const socket = getSocket();
          const seed = () =>
            socket.emit("change-song", { roomId: newRoom, song, position: probe.position });
          if (socket.connected) {
            socket.emit("join-room", newRoom);
            seed();
          } else {
            socket.once("connect", () => {
              socket.emit("join-room", newRoom);
              seed();
            });
          }
        }
      }
    };

    window.addEventListener("tt-join-room", handleJoinRoom);
    return () => window.removeEventListener("tt-join-room", handleJoinRoom);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const applySong = (song, opts) => setSong(song, opts);

    const broadcast = (state) => {
      window.dispatchEvent(new CustomEvent("tt-global-state", { detail: state }));
    };

    const onRoomState = (state) => {
      if (typeof state.playId === "number") playIdRef.current = state.playId;
      applySong(state.currentSong, { remember: false });
      setIsPlaying(!!state.isPlaying);
      broadcast({ currentSong: state.currentSong, isPlaying: !!state.isPlaying });
      applyQueue(state.playlist || []);
    };

    const onSyncSong = (data) => {
      if (typeof data.playId === "number") playIdRef.current = data.playId;
      applySong(data.song);
      setIsPlaying(!!data.isPlaying);
      broadcast({ currentSong: data.song, isPlaying: !!data.isPlaying });
    };

    const onSyncPlay = (data) => {
      setIsPlaying(!!data.isPlaying);
      broadcast({ isPlaying: !!data.isPlaying });
    };

    const onSyncQueue = (data) => applyQueue(data.playlist || []);

    const onConnect = () => socket.emit("join-room", roomId);

    socket.on("connect", onConnect);
    socket.on("room-state", onRoomState);
    socket.on("sync-song", onSyncSong);
    socket.on("sync-play", onSyncPlay);
    socket.on("sync-queue", onSyncQueue);

    if (socket.connected) socket.emit("join-room", roomId);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room-state", onRoomState);
      socket.off("sync-song", onSyncSong);
      socket.off("sync-play", onSyncPlay);
      socket.off("sync-queue", onSyncQueue);
    };
  }, [roomId]);

  
  useEffect(() => {
    const handlePlaySong = (e) => {
      const { song, list, autoplay = false, fromQueue = false } = e.detail;
      if (song && fromQueue) {
        // Jumping to a queued track: drop that entry, keep whatever context
        // (album, playlist, autoplay) was playing so it resumes afterwards.
        if (song._uniqueKey) {
          removeQueued(song._uniqueKey);
          socketRef.current?.emit("remove-from-queue", { roomId, songId: song._uniqueKey });
        }
        setSong(song);
        setIsPlaying(true);
        socketRef.current?.emit("change-song", { roomId, song, position: 0 });
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: song, isPlaying: true } }));
        return;
      }
      if (song) {
        autoplayRef.current = autoplay;
        autoplayQueueRef.current = [];
        autoplayHistoryRef.current = [song];
        playedIdxRef.current = new Set();
        if (list && Array.isArray(list) && list.length) {
          playContextRef.current = list;
          
          
          const byReference = list.indexOf(song);
          const byIdentity = list.findIndex(
            (candidate) =>
              candidate.youtubeId === song.youtubeId &&
              candidate.id === song.id &&
              candidate.title === song.title &&
              candidate.artist?.name === song.artist?.name
          );
          playContextIndexRef.current = byReference >= 0 ? byReference : byIdentity;
        } else {
          playContextRef.current = [];
          playContextIndexRef.current = -1;
        }
        
        setSong(song);
        // A new album/list/search starts a fresh "previous" history.
        historyRef.current = [];
        setIsPlaying(true);
        socketRef.current?.emit("change-song", { roomId, song, position: 0 });
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: song, isPlaying: true } }));
      } else if (e.detail && !e.detail.song && e.detail.id) {
         
         const fallbackSong = e.detail;
         setSong(fallbackSong);
         setIsPlaying(true);
         socketRef.current?.emit("change-song", { roomId, song: fallbackSong, position: 0 });
         window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: fallbackSong, isPlaying: true } }));
      }
    };

    const handleQueueSong = (e) => {
      const raw = e.detail;
      if (!raw) return;
      // A song that was queued before (or is playing from the queue) still
      // carries its old key; re-adding it must create a distinct entry.
      const { _uniqueKey, ...rest } = raw;
      if (!currentSongRef.current) {
        // Nothing playing: queueing a song should just start it.
        window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song: rest } }));
        return;
      }
      const song = { ...rest, _uniqueKey: newQueueKey() };
      applyQueue([...queueRef.current, song]);
      socketRef.current?.emit("add-to-queue", { roomId, song });
      toast(
        `Added "${song.title || 'Song'}" to queue`,
        {
          duration: 2500,
          icon: '🎵',
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
          },
        }
      );
    };
    
    const handleRemoveFromQueue = (e) => {
      const songId = e.detail;
      removeQueued(songId);
      socketRef.current?.emit("remove-from-queue", { roomId, songId });
    };
    
    const handleClearQueue = () => {
      applyQueue([]);
      socketRef.current?.emit("clear-queue", { roomId });
    };

    const handleReorderQueue = (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      if (typeof fromIndex === "number" && typeof toIndex === "number") {
        const next = [...queueRef.current];
        if (fromIndex >= 0 && fromIndex < next.length && toIndex >= 0 && toIndex < next.length) {
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          applyQueue(next);
        }
        socketRef.current?.emit("reorder-queue", { roomId, fromIndex, toIndex });
      }
    };

    const onRequestState = () => {
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: currentSongRef.current, isPlaying, queue }
      }));
    };

    const handlePlayerCommand = (e) => {
      const { action } = e.detail || {};
      if (action === "pause") {
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { isPlaying: false } }));
      } else if (action === "play") {
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { isPlaying: true } }));
      }
    };

    window.addEventListener("tt-play-song", handlePlaySong);
    window.addEventListener("tt-queue-song", handleQueueSong);
    window.addEventListener("tt-remove-from-queue", handleRemoveFromQueue);
    window.addEventListener("tt-clear-queue", handleClearQueue);
    window.addEventListener("tt-reorder-queue", handleReorderQueue);
    window.addEventListener("tt-request-global-state", onRequestState);
    window.addEventListener("tt-player-command", handlePlayerCommand);
    return () => {
      window.removeEventListener("tt-play-song", handlePlaySong);
      window.removeEventListener("tt-queue-song", handleQueueSong);
      window.removeEventListener("tt-remove-from-queue", handleRemoveFromQueue);
      window.removeEventListener("tt-clear-queue", handleClearQueue);
      window.removeEventListener("tt-reorder-queue", handleReorderQueue);
      window.removeEventListener("tt-request-global-state", onRequestState);
      window.removeEventListener("tt-player-command", handlePlayerCommand);
    };
  }, [roomId, isPlaying, queue]);

  // `auto` is true when the track ended on its own (not a skip button press).
  const handleNext = (opts) => {
    const auto = opts?.auto === true;
    const emitNext = (payload) =>
      socketRef.current?.emit("next-song", auto ? { ...payload, fromPlayId: playIdRef.current } : payload);
    const pending = queueRef.current;
    if (pending.length > 0) {
      const nextSong = pending[0];
      setSong(nextSong);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: nextSong, isPlaying: true },
      }));
      applyQueue(pending.slice(1));
      emitNext({ roomId });
      return;
    }

    if (autoplayRef.current) {
      if (autoplayLoadingRef.current) return;

      const playAutoplaySong = (nextSong) => {
        if (!nextSong) return;
        autoplayHistoryRef.current = [...autoplayHistoryRef.current, nextSong];
        setSong(nextSong);
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent("tt-global-state", {
          detail: { currentSong: nextSong, isPlaying: true },
        }));
        emitNext({ roomId, song: nextSong, preferContext: true });
      };

      const queued = autoplayQueueRef.current.shift();
      if (queued) {
        playAutoplaySong(queued);
        return;
      }

      const current = currentSongRef.current;
      if (!current) return;
      autoplayLoadingRef.current = true;
      const params = new URLSearchParams({
        videoId: current.youtubeId || current.id || "",
        title: current.title || "",
        artist: current.artist?.name || "",
      });
      fetch(`/api/autoplay?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : { songs: [] }))
        .then(({ songs = [] }) => {
          const heard = new Set(autoplayHistoryRef.current.map((song) => song.youtubeId || song.id));
          const fresh = songs.filter((song) => !heard.has(song.youtubeId || song.id));
          const [nextSong, ...rest] = fresh;
          autoplayQueueRef.current = rest;
          playAutoplaySong(nextSong);
        })
        .catch(() => {})
        .finally(() => { autoplayLoadingRef.current = false; });
      return;
    }

    const list = playContextRef.current;
    const contextIndex = playContextIndexRef.current;
    if (list.length > 0 && contextIndex >= 0) {
      let nextIndex;
      if (shuffleRef.current && list.length > 1) {
        const played = playedIdxRef.current;
        played.add(contextIndex);
        let pool = list.map((_, i) => i).filter((i) => !played.has(i));
        if (!pool.length && repeatRef.current === "context") {
          played.clear();
          played.add(contextIndex);
          pool = list.map((_, i) => i).filter((i) => i !== contextIndex);
        }
        nextIndex = pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
      } else {
        nextIndex = contextIndex + 1;
        if (nextIndex >= list.length) nextIndex = repeatRef.current === "context" ? 0 : -1;
      }

      if (nextIndex === -1) {
        // End of the album/playlist with repeat off: keep the music going
        // with similar songs, like Spotify's autoplay.
        autoplayRef.current = true;
        autoplayQueueRef.current = [];
        autoplayHistoryRef.current = [...list];
        handleNext(opts);
        return;
      }
      const nextSong = list[nextIndex];
      playContextIndexRef.current = nextIndex;
      setSong(nextSong);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: nextSong, isPlaying: true },
      }));
      emitNext({ roomId, song: nextSong, preferContext: true });
      return;
    }


    if (!list || list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const nextIndex = curIdx === -1 ? 0 : (curIdx + 1) % list.length;
    const nextSong = list[nextIndex];
    playContextIndexRef.current = nextIndex;

    setSong(nextSong);
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent("tt-global-state", {
      detail: { currentSong: nextSong, isPlaying: true },
    }));
    emitNext({ roomId, song: nextSong });
  };

  handleNextRef.current = handleNext;

  // Every listener's player fires "ended". Wait a beat and only advance if
  // nobody else has moved the room on yet, so a queued track is never
  // skipped (works even against a socket server without the play-token check).
  const handleEnded = () => {
    if (repeatRef.current === "one" && currentSongRef.current) {
      setReplayNonce((n) => n + 1);
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "seek", position: 0, at: Date.now() } }));
      socketRef.current?.emit("seek-time", { roomId, position: 0 });
      return;
    }
    const endedKey = songKey(currentSongRef.current);
    const endedPlayId = playIdRef.current;
    setTimeout(() => {
      if (songKey(currentSongRef.current) !== endedKey || playIdRef.current !== endedPlayId) return;
      handleNextRef.current?.({ auto: true });
    }, Math.floor(Math.random() * 400));
  };

  const restartCurrent = () => {
    window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "seek", position: 0, at: Date.now() } }));
    socketRef.current?.emit("seek-time", { roomId, position: 0 });
  };

  // Like Spotify: more than 3s in restarts the track; otherwise go back to
  // the song that actually played before (queued, autoplay or context).
  const handlePrev = () => {
    const probe = { position: 0 };
    window.dispatchEvent(new CustomEvent("tt-get-position", { detail: probe }));
    if (probe.position > 3) {
      restartCurrent();
      return;
    }

    const list = playContextRef.current;
    let prevSong = historyRef.current.pop() || null;
    if (!prevSong && list.length > 0 && !autoplayRef.current) {
      const cur = currentSongRef.current;
      const saved = playContextIndexRef.current;
      const curIdx = saved >= 0 ? saved : (cur ? list.findIndex((s) => s.id === cur.id) : -1);
      if (curIdx > 0) prevSong = list[curIdx - 1];
    }
    if (!prevSong) {
      restartCurrent();
      return;
    }

    const idx = list.findIndex((s) => s.id === prevSong.id);
    if (idx >= 0) playContextIndexRef.current = idx;
    if (autoplayRef.current) {
      const h = autoplayHistoryRef.current;
      if (h.length > 1 && h[h.length - 1]?.id === currentSongRef.current?.id) h.pop();
    }

    setSong(prevSong, { remember: false });
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent("tt-global-state", {
      detail: { currentSong: prevSong, isPlaying: true },
    }));
    socketRef.current?.emit("prev-song", { roomId, song: prevSong, preferContext: true });
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((p) => !p);
  };

  if (!currentSong) {
    return (
      <>
      <div className="hidden md:block flex-shrink-0 z-50 bg-black border-t border-[var(--tt-divider)] relative overflow-hidden">
        {}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--tt-accent)]/40 to-transparent" />

        {}
        <div className="absolute -top-20 left-1/4 w-64 h-32 rounded-full opacity-15 blur-[60px] pointer-events-none" style={{ background: "var(--tt-accent)" }} />
        <div className="absolute -top-16 right-1/4 w-48 h-24 rounded-full opacity-10 blur-[50px] pointer-events-none" style={{ background: "var(--tt-accent-2, #17c3a3)" }} />

        {}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <div className="flex items-end gap-[3px] h-8 opacity-[0.07]">
            {[40, 65, 30, 80, 50, 70, 35, 75, 55, 45, 85, 60, 40, 70, 50].map((h, i) => (
              <span
                key={i}
                className="w-[2px] rounded-full bg-green-400"
                style={{
                  height: `${h}%`,
                  animation: `visualizer-bar ${1.8 + (i % 5) * 0.3}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center gap-3 sm:gap-4 h-[72px] px-6">
          {}
          <div className="relative flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11">
            {}
            <div
              className="absolute inset-0 rounded-full border border-transparent"
              style={{
                borderImage: "linear-gradient(var(--tt-accent), transparent 60%) 1",
                animation: "spin 4s linear infinite",
              }}
            />
            {}
            <div
              className="absolute inset-[-3px] rounded-full opacity-30"
              style={{
                border: "1px dashed var(--tt-accent)",
                animation: "spin 8s linear infinite reverse",
              }}
            />
            {}
            <div className="absolute inset-0 m-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 flex items-center justify-center backdrop-blur-sm">
              <Music4 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-green-400" />
            </div>
          </div>

          {}
          <div className="text-left leading-tight select-none">
            <p className="text-neutral-200 text-sm font-semibold tracking-tight">
              Pick something to vibe to
            </p>
            <p className="text-neutral-500 text-xs mt-0.5">
              Search, browse, or hit shuffle
            </p>
          </div>

          {}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("tt-shuffle-play"))}
            className="hidden sm:flex items-center gap-1.5 ml-2 px-3.5 h-8 rounded-full bg-white text-black hover:scale-[1.04] active:scale-100 transition-transform"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Shuffle play</span>
          </button>
        </div>
      </div>
      <MobileTabBar />
      </>
    );
  }

  return (
    <>
    <div className="flex-shrink-0 z-50 bg-black border-t border-[var(--tt-divider)]">
      <PlayerFooter
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={handleTogglePlayPause}
        onNext={handleNext}
        onEnded={handleEnded}
        replayNonce={replayNonce}
        shuffle={shuffle}
        repeat={repeat}
        onToggleShuffle={toggleShuffle}
        onCycleRepeat={cycleRepeat}
        onPrev={handlePrev}
        roomId={roomId}
        socketRef={socketRef}
        hasSongs={playContextRef.current.length > 0 || currentSong != null}
        queueLength={queue.length}
      />
    </div>
    <MobileTabBar />
    </>
  );
}
