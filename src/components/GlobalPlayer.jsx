"use client";

import { useState, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { resolveRoomId, joinRoomId } from "@/lib/room";
import PlayerFooter from "./PlayerFooter";
import ReactionOverlay from "./ReactionOverlay";

export default function GlobalPlayer() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [roomId, setRoomId] = useState("");
  const socketRef = useRef(null);

  const currentSongRef = useRef(null);
  const playContextRef = useRef([]);

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

  // Handle Play Requests and State Requests
  useEffect(() => {
    const handlePlaySong = (e) => {
      const { song, list } = e.detail;
      if (song) {
        if (list && Array.isArray(list)) playContextRef.current = list;
        
        setCurrentSong(song);
        setIsPlaying(true);
        socketRef.current?.emit("change-song", { roomId, song, position: 0 });
        window.dispatchEvent(new CustomEvent("tt-global-state", { detail: { currentSong: song, isPlaying: true } }));
      } else if (e.detail && !e.detail.song && e.detail.id) {
         // Fallback if detail is just a song object
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
    };
    
    const handleRemoveFromQueue = (e) => {
      const songId = e.detail;
      socketRef.current?.emit("remove-from-queue", { roomId, songId });
    };
    
    const handleClearQueue = () => {
      socketRef.current?.emit("clear-queue", { roomId });
    };

    const onRequestState = () => {
      window.dispatchEvent(new CustomEvent("tt-global-state", {
        detail: { currentSong: currentSongRef.current, isPlaying, queue }
      }));
    };

    window.addEventListener("tt-play-song", handlePlaySong);
    window.addEventListener("tt-queue-song", handleQueueSong);
    window.addEventListener("tt-remove-from-queue", handleRemoveFromQueue);
    window.addEventListener("tt-clear-queue", handleClearQueue);
    window.addEventListener("tt-request-global-state", onRequestState);
    return () => {
      window.removeEventListener("tt-play-song", handlePlaySong);
      window.removeEventListener("tt-queue-song", handleQueueSong);
      window.removeEventListener("tt-remove-from-queue", handleRemoveFromQueue);
      window.removeEventListener("tt-clear-queue", handleClearQueue);
      window.removeEventListener("tt-request-global-state", onRequestState);
    };
  }, [roomId, isPlaying, queue]);

  const handleNext = () => {
    if (queue.length > 0) {
      socketRef.current?.emit("next-song", { roomId });
      return;
    }
    const list = playContextRef.current;
    if (!list || list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const nextIndex = curIdx === -1 ? 0 : (curIdx + 1) % list.length;
    const nextSong = list[nextIndex];
    
    setCurrentSong(nextSong);
    setIsPlaying(true);
    socketRef.current?.emit("next-song", { roomId, song: nextSong });
  };

  const handlePrev = () => {
    const list = playContextRef.current;
    if (!list || list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const prevIndex = curIdx === -1 ? 0 : (curIdx - 1 + list.length) % list.length;
    const prevSong = list[prevIndex];
    
    setCurrentSong(prevSong);
    setIsPlaying(true);
    socketRef.current?.emit("prev-song", { roomId, song: prevSong });
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((p) => !p);
  };

  return (
    <div className="flex-shrink-0 z-50 bg-black border-t border-neutral-800">
      <ReactionOverlay socketRef={socketRef} roomId={roomId} />
      <PlayerFooter
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={handleTogglePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        roomId={roomId}
        socketRef={socketRef}
        hasSongs={playContextRef.current.length > 0 || currentSong != null}
      />
    </div>
  );
}
