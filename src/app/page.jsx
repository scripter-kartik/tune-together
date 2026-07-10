"use client";

import Header from "../components/Header";
import Home from "../components/Home";
import PlayerFooter from "../components/PlayerFooter";
import { useState, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSocket } from "../lib/socket";
import { useChat } from "../hooks/useChat";
import { useUser } from "@clerk/nextjs";

export default function Page() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const socketRef = useRef(null);

  const songsRef = useRef([]);
  const currentSongRef = useRef(null);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  
  useChat();

  const terms = [
    "sad", "chill", "lofi", "funny", "happy", "romantic", "energetic", "dark", "pop", "rap",
    "jazz", "classical", "study", "party", "workout", "sleep", "summer", "night", "driving", "focus",
    "calm", "uplifting", "dreamy", "moody", "melancholic", "relax", "deep", "groovy", "warm", "bright",
    "spacey", "ambient", "emotional", "nostalgic", "smooth", "aggressive", "soft", "serene", "fresh", "funky",
    "powerful", "peaceful", "psychedelic", "mysterious", "epic", "sadboi", "cute", "chillwave", "hopeful", "angsty",
    "rnb", "edm", "house", "techno", "trance", "dubstep", "kpop", "indie", "folk", "metal",
    "punk", "blues", "soul", "reggae", "country", "disco", "gospel", "afrobeat", "synthwave", "phonk",
    "hyperpop", "trap", "grunge", "garage", "bossa nova", "latin", "salsa", "tango", "flamenco", "minimal",
    "gaming", "coding", "meditation", "yoga", "gym", "running", "cooking", "travel", "sports", "cleaning",
    "reading", "drinking", "camping", "dating", "driving_fast", "roadtrip", "picnic", "celebration", "festive", "shopping",
    "morning", "evening", "midnight", "rainy", "sunset", "sunrise", "winter", "spring", "autumn", "monsoon",
    "breakup", "motivation", "healing", "heartbreak", "focus_deep", "chill_beach", "urban", "city_lights", "club", "festival",
    "retro", "vintage", "cinematic", "anime", "vibes", "aesthetic", "future", "fantasy", "sci-fi", "loverboy",
    "relaxation", "intense", "high_energy", "sad_love", "despair", "minimalist", "slow", "fast", "twilight", "neon",
    "racing", "study_beats", "late_night", "snow", "rain", "storm", "cozy", "soft_piano", "guitar", "strings"
  ];

  const random = useMemo(
    () => terms[Math.floor(Math.random() * terms.length)],
    []
  );

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

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("join-room", roomId);
    };

    const applySong = (song) => {
      if (!song) return;
      setCurrentSong(song);
      const idx = songsRef.current.findIndex((s) => s.id === song.id);
      if (idx !== -1) setCurrentSongIndex(idx);
    };

    const onRoomState = (state) => {
      applySong(state.currentSong);
      setQueue(state.playlist || []);
      setIsPlaying(!!state.isPlaying);
      window.dispatchEvent(
        new CustomEvent("tt-sync", { detail: { type: "state", ...state } })
      );
    };

    const onSyncQueue = (data) => {
      setQueue(data.playlist || []);
    };

    const onSyncSong = (data) => {
      applySong(data.song);
      setIsPlaying(!!data.isPlaying);
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "song", ...data } }));
    };

    const onSyncPlay = (data) => {
      setIsPlaying(!!data.isPlaying);
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "play", ...data } }));
    };

    const onSyncSeek = (data) => {
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { type: "seek", ...data } }));
    };

    socket.on("connect", onConnect);
    socket.on("room-state", onRoomState);
    socket.on("sync-song", onSyncSong);
    socket.on("sync-play", onSyncPlay);
    socket.on("sync-seek", onSyncSeek);
    socket.on("sync-queue", onSyncQueue);

    if (socket.connected) socket.emit("join-room", roomId);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room-state", onRoomState);
      socket.off("sync-song", onSyncSong);
      socket.off("sync-play", onSyncPlay);
      socket.off("sync-seek", onSyncSeek);
      socket.off("sync-queue", onSyncQueue);
    };
  }, [roomId]);

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

        if (currentSongIndex === null && !currentSongRef.current) {
          setCurrentSongIndex(0);
          setCurrentSong(data.data[0]);
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

  useEffect(() => {
    const browseQuery = sessionStorage.getItem('browseQuery');
    if (browseQuery) {
      setQuery(browseQuery);
      fetchSongs(browseQuery);
      sessionStorage.removeItem('browseQuery');
    } else {
      fetchSongs(random);
    }
  }, [random]);

  const handlePlay = (song) => {
    const idx = songs.findIndex((s) => s.id === song.id);
    setCurrentSong(song);
    if (idx !== -1) setCurrentSongIndex(idx);
    setIsPlaying(true);
    socketRef.current?.emit("change-song", {
      roomId,
      song,
      position: 0,
    });
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((p) => !p);
  };

  const handleAddToQueue = (song) => {
    if (!song) return;
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id)) return prev;
      return [...prev, song];
    });
    socketRef.current?.emit("add-to-queue", { roomId, song });
  };

  const handleRemoveFromQueue = (songId) => {
    setQueue((prev) => prev.filter((s) => s.id !== songId));
    socketRef.current?.emit("remove-from-queue", { roomId, songId });
  };

  const handleClearQueue = () => {
    setQueue([]);
    socketRef.current?.emit("clear-queue", { roomId });
  };

  const handleNext = () => {

    if (queue.length > 0) {
      socketRef.current?.emit("next-song", { roomId });
      return;
    }
    if (songs.length === 0) return;
    const nextIndex =
      currentSongIndex !== null ? (currentSongIndex + 1) % songs.length : 0;
    setCurrentSongIndex(nextIndex);
    setCurrentSong(songs[nextIndex]);
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
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
    socketRef.current?.emit("prev-song", { roomId, song: songs[prevIndex] });
  };

  const getVisibleSongs = () => songs.slice(0, visibleCount);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-black">
      <header className="flex-shrink-0 z-40 border-b border-neutral-800">
        <Header query={query} setQuery={setQuery} handleSearch={handleSearch} roomId={roomId} />
      </header>
      
      <main className="flex-1 overflow-hidden">
        <Home
          songs={getVisibleSongs()}
          onLoadMore={handleLoadMore}
          showLoadMore={songs.length > visibleCount}
          onPlay={handlePlay}
          onQueue={handleAddToQueue}
          currentSongId={currentSong?.id}
          isPlaying={isPlaying}
          queue={queue}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={handleClearQueue}
          isLoading={isLoading}
          error={error}
          roomId={roomId}
          socketRef={socketRef}
          onOpenChat={setSelectedChatUser}
          selectedChatUser={selectedChatUser}
          selectedArtistId={selectedArtistId}
          onOpenArtist={setSelectedArtistId}
          selectedAlbumId={selectedAlbumId}
          onOpenAlbum={setSelectedAlbumId}
        />
      </main>
      
      <footer className="flex-shrink-0 z-50 bg-black border-t border-neutral-800">
        <PlayerFooter
          song={currentSong}
          isPlaying={isPlaying}
          onPlayPause={handleTogglePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          roomId={roomId}
          socketRef={socketRef}
          hasSongs={songs.length > 0}
        />
      </footer>
    </div>
  );
}