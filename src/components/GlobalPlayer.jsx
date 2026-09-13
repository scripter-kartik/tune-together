"use client";

import { useState, useEffect, useRef } from "react";
import { Music4, Shuffle } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { resolveRoomId, joinRoomId } from "@/lib/room";
import PlayerFooter from "./PlayerFooter";
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

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

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

    const applySong = (song) => {
      setCurrentSong(song || null);
    };

    const broadcast = (state) => {
      window.dispatchEvent(new CustomEvent("tt-global-state", { detail: state }));
    };

    const onRoomState = (state) => {
      applySong(state.currentSong);
      setQueue(state.playlist || []);
      setIsPlaying(!!state.isPlaying);
      broadcast({
        currentSong: state.currentSong,
        isPlaying: !!state.isPlaying,
        queue: state.playlist || []
      });
    };

    const onSyncSong = (data) => {
      applySong(data.song);
      setIsPlaying(!!data.isPlaying);
      broadcast({ currentSong: data.song, isPlaying: !!data.isPlaying });
    };

    const onSyncPlay = (data) => {
      setIsPlaying(!!data.isPlaying);
      broadcast({ isPlaying: !!data.isPlaying });
    };

    const onSyncQueue = (data) => {
      setQueue(data.playlist || []);
      broadcast({ queue: data.playlist || [] });
    };

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
      const { song, list, autoplay = false } = e.detail;
      if (song) {
        autoplayRef.current = autoplay;
        autoplayQueueRef.current = [];
        autoplayHistoryRef.current = [song];
        if (list && Array.isArray(list) && list.length) {
          playContextRef.current = list;
          // Preserve the selected result's exact position. ID-only matching
          // breaks when a search contains duplicate videos or versions.
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
        
        setCurrentSong(song);
        setIsPlaying(true);
        socketRef.current?.emit("change-song", { roomId, song, position: 0 });
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: song, isPlaying: true } }));
      } else if (e.detail && !e.detail.song && e.detail.id) {
         
         const fallbackSong = e.detail;
         setCurrentSong(fallbackSong);
         setIsPlaying(true);
         socketRef.current?.emit("change-song", { roomId, song: fallbackSong, position: 0 });
         window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: fallbackSong, isPlaying: true } }));
      }
    };

    const handleQueueSong = (e) => {
      const song = e.detail;
      if (!song) return;
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
      socketRef.current?.emit("remove-from-queue", { roomId, songId });
    };
    
    const handleClearQueue = () => {
      socketRef.current?.emit("clear-queue", { roomId });
    };

    const handleReorderQueue = (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      if (typeof fromIndex === "number" && typeof toIndex === "number") {
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

  const handleNext = () => {
    if (autoplayRef.current) {
      if (autoplayLoadingRef.current) return;

      const playAutoplaySong = (nextSong) => {
        if (!nextSong) return;
        autoplayHistoryRef.current = [...autoplayHistoryRef.current, nextSong];
        setCurrentSong(nextSong);
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent("tt-global-state", {
          detail: { currentSong: nextSong, isPlaying: true },
        }));
        socketRef.current?.emit("next-song", { roomId, song: nextSong, preferContext: true });
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
      const nextIndex = (contextIndex + 1) % list.length;
      const nextSong = list[nextIndex];
      playContextIndexRef.current = nextIndex;
      setCurrentSong(nextSong);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: nextSong, isPlaying: true },
      }));
      socketRef.current?.emit("next-song", { roomId, song: nextSong, preferContext: true });
      return;
    }

    if (queue.length > 0) {
      const nextSong = queue[0];
      const remaining = queue.slice(1);
      setCurrentSong(nextSong);
      setQueue(remaining);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: nextSong, isPlaying: true, queue: remaining },
      }));
      socketRef.current?.emit("next-song", { roomId });
      return;
    }
    if (!list || list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const nextIndex = curIdx === -1 ? 0 : (curIdx + 1) % list.length;
    const nextSong = list[nextIndex];
    playContextIndexRef.current = nextIndex;

    setCurrentSong(nextSong);
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent("tt-global-state", {
      detail: { currentSong: nextSong, isPlaying: true },
    }));
    socketRef.current?.emit("next-song", { roomId, song: nextSong });
  };

  const handlePrev = () => {
    if (autoplayRef.current) {
      const history = autoplayHistoryRef.current;
      if (history.length < 2) return;
      history.pop();
      const previousSong = history[history.length - 1];
      setCurrentSong(previousSong);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: previousSong, isPlaying: true },
      }));
      socketRef.current?.emit("prev-song", { roomId, song: previousSong, preferContext: true });
      return;
    }

    const list = playContextRef.current;
    if (!list || list.length === 0) return;
    const savedIndex = playContextIndexRef.current;
    const cur = currentSongRef.current;
    const curIdx = savedIndex >= 0 ? savedIndex : (cur ? list.findIndex((s) => s.id === cur.id) : -1);
    const prevIndex = curIdx === -1 ? 0 : (curIdx - 1 + list.length) % list.length;
    const prevSong = list[prevIndex];
    playContextIndexRef.current = prevIndex;

    setCurrentSong(prevSong);
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
      <div className="flex-shrink-0 z-50 bg-black border-t border-[var(--tt-divider)] relative overflow-hidden">
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
          <div className="hidden sm:flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-[var(--tt-border)] text-neutral-500 hover:bg-white/[0.07] hover:text-neutral-300 transition-all cursor-default">
            <Shuffle className="w-3 h-3" />
            <span className="text-[10px] font-medium tracking-wide uppercase">Shuffle</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 z-50 bg-black border-t border-[var(--tt-divider)]">
      <PlayerFooter
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={handleTogglePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        roomId={roomId}
        socketRef={socketRef}
        hasSongs={playContextRef.current.length > 0 || currentSong != null}
        queueLength={queue.length}
      />
    </div>
  );
}
