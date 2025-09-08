"use client";

import Header from "./components/Header";
import Home from "./components/Home";
import PlayerFooter from "./components/PlayerFooter";
import { useState, useEffect, useMemo } from "react";

export default function Page() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const terms = [
    "sad",
    "chill",
    "lofi",
    "funny",
    "happy",
    "romantic",
    "energetic",
    "dark",
    "pop",
    "rap",
    "jazz",
    "classical",
    "study",
    "party",
    "workout",
    "sleep",
    "summer",
    "night",
    "driving",
    "focus",
  ];

  const random = useMemo(
    () => terms[Math.floor(Math.random() * terms.length)],
    []
  );

  const fetchSongs = async (searchTerm) => {
    try {
      const response = await fetch(
        `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(
          searchTerm
        )}`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key":
              "cfca8c68f7msh306e9c5ce342237p1f51efjsn0084e1e47e94",
            "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
          },
        }
      );
      const data = await response.json();
      setSongs(data.data || []);
      setVisibleCount(20);
    } catch (err) {
      console.error("Error fetching songs:", err);
    }
  };

  const handleSearch = () => {
    if (query.trim() !== "") fetchSongs(query);
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 20);

  useEffect(() => {
    fetchSongs(random);
  }, [random]);

  const handlePlay = (song) => {
    const index = songs.findIndex((s) => s.id === song.id);
    if (index !== -1) {
      setCurrentSongIndex(index);
      setIsPlaying(true);
    }
  };

  const handleTogglePlayPause = () => setIsPlaying((prev) => !prev);

  const handleNext = () => {
    setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setIsPlaying(true);
  };

  const getVisibleSongs = () => {
    if (songs.length === 0) return [];
    const repeated = [];
    const times = Math.ceil(visibleCount / songs.length);
    for (let i = 0; i < times; i++) {
      repeated.push(
        ...songs.map((song, index) => ({
          ...song,
          _uniqueKey: `${song.id}-${i}-${index}`,
        }))
      );
    }
    return repeated.slice(0, visibleCount);
  };

  return (
    <div className="h-screen overflow-auto scrollbar-none pb-32">
      <Header query={query} setQuery={setQuery} handleSearch={handleSearch} />
      <Home
        songs={getVisibleSongs()}
        onLoadMore={handleLoadMore}
        showLoadMore={true}
        visibleCount={visibleCount}
        onPlay={handlePlay}
      />
      {currentSongIndex !== null && (
        <PlayerFooter
          song={songs[currentSongIndex]}
          isPlaying={isPlaying}
          onPlayPause={handleTogglePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
}
