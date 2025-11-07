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
    // Original
    "sad", "chill", "lofi", "funny", "happy", "romantic", "energetic", "dark", "pop", "rap",
    "jazz", "classical", "study", "party", "workout", "sleep", "summer", "night", "driving", "focus",

    // More moods
    "calm", "uplifting", "dreamy", "moody", "melancholic", "relax", "deep", "groovy", "warm", "bright",
    "spacey", "ambient", "emotional", "nostalgic", "smooth", "aggressive", "soft", "serene", "fresh", "funky",
    "powerful", "peaceful", "psychedelic", "mysterious", "epic", "sadboi", "cute", "chillwave", "hopeful", "angsty",

    // Genres
    "rnb", "edm", "house", "techno", "trance", "dubstep", "kpop", "indie", "folk", "metal",
    "punk", "blues", "soul", "reggae", "country", "disco", "gospel", "afrobeat", "synthwave", "phonk",
    "hyperpop", "trap", "grunge", "garage", "bossa nova", "latin", "salsa", "tango", "flamenco", "minimal",

    // Activities
    "gaming", "coding", "meditation", "yoga", "gym", "running", "cooking", "travel", "sports", "cleaning",
    "reading", "drinking", "camping", "dating", "driving_fast", "roadtrip", "picnic", "celebration", "festive", "shopping",

    // Time-based
    "morning", "evening", "midnight", "rainy", "sunset", "sunrise", "winter", "spring", "autumn", "monsoon",

    // Themes
    "breakup", "motivation", "healing", "heartbreak", "focus_deep", "chill_beach", "urban", "city_lights", "club", "festival",
    "retro", "vintage", "cinematic", "anime", "vibes", "aesthetic", "future", "fantasy", "sci-fi", "loverboy",

    // More variations
    "relaxation", "intense", "high_energy", "sad_love", "despair", "minimalist", "slow", "fast", "twilight", "neon",
    "racing", "study_beats", "late_night", "snow", "rain", "storm", "cozy", "soft_piano", "guitar", "strings"
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
        // Auto-load first song into footer
        if (currentSongIndex === null) {
          setCurrentSongIndex(0);
        }
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

  // Check for browse query from sessionStorage on mount
  useEffect(() => {
    const browseQuery = sessionStorage.getItem('browseQuery');
    if (browseQuery) {
      setQuery(browseQuery);
      fetchSongs(browseQuery);
      sessionStorage.removeItem('browseQuery'); // Clear after use
    } else {
      fetchSongs(random);
    }
  }, [random]);

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
    <div className="h-screen w-screen overflow-auto scrollbar-none">
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
      {/* Always show footer - with or without a song */}
      <PlayerFooter
        song={currentSongIndex !== null && songs[currentSongIndex] ? songs[currentSongIndex] : null}
        isPlaying={isPlaying}
        onPlayPause={handleTogglePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        roomId={roomId}
        socketRef={socketRef}
        hasSongs={songs.length > 0}
      />
    </div>
  );
}