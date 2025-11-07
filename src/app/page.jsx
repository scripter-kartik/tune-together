// src/app/page.jsx

"use client";

import Header from "../components/Header";
import Home from "../components/Home";
import PlayerFooter from "../components/PlayerFooter";
import { useState, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSocket } from "../lib/socket";

export default function Page() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [isRoomHost, setIsRoomHost] = useState(false);
  const socketRef = useRef(null);

  const terms = [
    "sad","chill","lofi","funny","happy","romantic","energetic","dark","pop","rap",
    "jazz","classical","study","party","workout","sleep","summer","night","driving","focus",
  ];

  const random = useMemo(
    () => terms[Math.floor(Math.random() * terms.length)],
    []
  );

  // Initialize room from URL or create new one
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let room = params.get("room");
    if (!room) {
      room = uuidv4();
      setIsRoomHost(true);
      window.history.replaceState({}, "", `?room=${room}`);
    }
    setRoomId(room);
  }, []);

  // Socket connection (single instance)
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("join-room", roomId);
    };
    socket.on("connect", onConnect);

    // Late join state
    socket.on("room-state", (state) => {
      const { currentSong, isPlaying } = state;
      if (currentSong) {
        const idx = songs.findIndex((s) => s.id === currentSong.id);
        if (idx !== -1) setCurrentSongIndex(idx);
      }
      setIsPlaying(!!isPlaying);
      // PlayerFooter will also sync the audio clock via events with {position, at}
      window.dispatchEvent(
        new CustomEvent("tt-sync", { detail: { type: "state", ...state } })
      );
    });

    // Sync updates for UI state (audio handling is in PlayerFooter)
    socket.on("sync-song", (data) => {
      const idx = songs.findIndex((s) => s.id === data.song?.id);
      if (idx !== -1) setCurrentSongIndex(idx);
      setIsPlaying(!!data.isPlaying);
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "song", ...data } }));
    });

    socket.on("sync-play", (data) => {
      setIsPlaying(!!data.isPlaying);
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "play", ...data } }));
    });

    socket.on("sync-seek", (data) => {
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "seek", ...data } }));
    });

    return () => {
      socket.off("connect", onConnect);
    };
  }, [roomId, songs]);

  const fetchSongs = async (searchTerm) => {
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
      if (!apiKey) throw new Error("API key is missing. Please check your .env.local file.");

      const response = await fetch(
        `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
          },
        }
      );

      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const data = await response.json();
      if (!data.data || data.data.length === 0) {
        setError("No songs found. Try a different search term.");
        setSongs([]);
      } else {
        setSongs(data.data);
        setVisibleCount(20);
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch songs. Please try again.");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (query.trim() !== "") fetchSongs(query);
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 20);

  useEffect(() => { fetchSongs(random); }, [random]);

  // Song selection — emit change with position=0
  const handlePlay = (song) => {
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx !== -1) {
      setCurrentSongIndex(idx);
      setIsPlaying(true);
      socketRef.current?.emit("change-song", {
        roomId,
        song,
        position: 0,
      });
    }
  };

  // UI-only toggle; real emit happens inside PlayerFooter with accurate position
  const handleTogglePlayPause = () => {
    setIsPlaying((p) => !p);
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    const nextIndex =
      currentSongIndex !== null ? (currentSongIndex + 1) % songs.length : 0;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
    socketRef.current?.emit("next-song", { roomId, song: songs[nextIndex] });
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    const prevIndex =
      currentSongIndex !== null
        ? (currentSongIndex - 1 + songs.length) % songs.length
        : 0;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
    socketRef.current?.emit("prev-song", { roomId, song: songs[prevIndex] });
  };

  const getVisibleSongs = () => songs.slice(0, visibleCount);

  return (
    <div className="h-screen overflow-auto scrollbar-none pb-32">
      <Header query={query} setQuery={setQuery} handleSearch={handleSearch} />
      <Home
        songs={getVisibleSongs()}
        onLoadMore={handleLoadMore}
        showLoadMore={songs.length > visibleCount}
        onPlay={handlePlay}
        isLoading={isLoading}
        error={error}
        roomId={roomId}
        socketRef={socketRef}
      />
      {currentSongIndex !== null && songs[currentSongIndex] && (
        <PlayerFooter
          song={songs[currentSongIndex]}
          isPlaying={isPlaying}
          onPlayPause={handleTogglePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          roomId={roomId}
          socketRef={socketRef}
        />
      )}
    </div>
  );
}
