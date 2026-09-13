"use client";

import Header from "../components/Header";
import Home from "../components/Home";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";

export default function Page() {
  const { user, isSignedIn } = useUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isSearchQuery, setIsSearchQuery] = useState(false);
  const [topArtists, setTopArtists] = useState([]);
  const [historySongs, setHistorySongs] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [mixes, setMixes] = useState([]);

  useEffect(() => {
    const onGlobalState = (e) => {
      const { currentSong: gSong, isPlaying: gIsPlaying, queue: gQueue } = e.detail;
      if (gSong !== undefined) setCurrentSong(gSong);
      if (gIsPlaying !== undefined) setIsPlaying(gIsPlaying);
      if (gQueue !== undefined && gQueue !== null) setQueue(gQueue);
    };
    window.addEventListener("tt-global-state", onGlobalState);
    window.dispatchEvent(new CustomEvent("tt-request-global-state"));
    return () => window.removeEventListener("tt-global-state", onGlobalState);
  }, []);

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

  const randomTerms = useMemo(
    () => [...terms].sort(() => Math.random() - 0.5).slice(0, 5),
    []
  );

  const fetchSongs = async (searchTerm, isUserSearch = false) => {
    setIsLoading(true);
    setError(null);
    setIsSearchQuery(isUserSearch);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      
      if (!data.songs || data.songs.length === 0) {
        setError("No results found. Try a different search term.");
        setSongs([]);
        setArtists([]);
        setAlbums([]);
      } else {
        setSongs(data.songs);
        setArtists(data.artists || []);
        setAlbums(data.albums || []);
        setVisibleCount(20);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch results. Please try again.");
      setSongs([]);
      setArtists([]);
      setAlbums([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHomeFeed = async (searchTerms) => {
    setIsLoading(true);
    setError(null);
    setIsSearchQuery(false);
    try {
      const results = await Promise.all(
        searchTerms.map((t) =>
          fetch(`/api/search?q=${encodeURIComponent(t)}`)
            .then((r) => (r.ok ? r.json() : { songs: [], artists: [], albums: [] }))
            .catch(() => ({ songs: [], artists: [], albums: [] }))
        )
      );

      const dedupe = (arr) => {
        const seen = new Set();
        return arr.filter((x) => x && x.id != null && !seen.has(x.id) && seen.add(x.id));
      };
      const shuffle = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const mixedSongs = shuffle(dedupe(results.flatMap((r) => r.songs || [])));
      const artists = dedupe(results.flatMap((r) => r.artists || []));
      const albums = dedupe(results.flatMap((r) => r.albums || []));

      if (mixedSongs.length === 0) {
        setError("No results found. Try a different search term.");
        setSongs([]);
        setArtists([]);
        setAlbums([]);
      } else {
        setSongs(mixedSongs);
        setArtists(artists);
        setAlbums(albums);
        setVisibleCount(20);
      }
    } catch (err) {
      console.error("Error fetching home feed:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch results. Please try again.");
      setSongs([]);
      setArtists([]);
      setAlbums([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (overrideQuery) => {
    const q = overrideQuery || query;
    if (q.trim() !== "") {
      fetchSongs(q, true);
    }
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 20);

  const handleGoHome = () => {
    setSelectedArtistId(null);
    setSelectedAlbumId(null);
    setSelectedPlaylist(null);
    if (isSearchQuery || query) {
      setQuery("");
      setIsSearchQuery(false);
      fetchHomeFeed(randomTerms);
    }
  };

  useEffect(() => {
    if (!query.trim() && isSearchQuery) {
      setIsSearchQuery(false);
      fetchHomeFeed(randomTerms);
    }
  }, [query, isSearchQuery, randomTerms]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const browseQuery = sessionStorage.getItem('browseQuery');
    
    if (urlQuery) {
      setQuery(urlQuery);
      fetchSongs(urlQuery, true);
    } else if (browseQuery) {
      setQuery(browseQuery);
      sessionStorage.removeItem('browseQuery');
      setTimeout(() => fetchSongs(browseQuery, true), 0);
    } else {
      fetchHomeFeed(randomTerms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomTerms]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;
      const data = await res.json();
      setTopArtists(data.topArtists || []);
      setHistorySongs(data.songs || []);
      setRecentHistory(data.recentHistory || []);
    } catch (err) {
      console.error("Failed to fetch listening history:", err);
    }
  };

  const recordPlay = async (song) => {
    if (!isSignedIn || !song?.id) return;
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song }),
      });
      fetchHistory();
    } catch (err) {
      console.error("Failed to record play:", err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/recommendations");
      if (!res.ok) return;
      const data = await res.json();
      setRecommendations(data.songs || []);
      setMixes(data.mixes || []);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchHistory();
      fetchRecommendations();
    } else {
      setTopArtists([]);
      setHistorySongs([]);
      setRecentHistory([]);
      setRecommendations([]);
      setMixes([]);
    }
  }, [isSignedIn]);

  const handlePlay = (song, list) => {
    recordPlay(song);
    const context = Array.isArray(list) && list.length ? list : songs;
    window.dispatchEvent(new CustomEvent("tt-play-song", {
      detail: { song, list: context, autoplay: isSearchQuery },
    }));
  };

  const handleAddToQueue = (song) => {
    window.dispatchEvent(new CustomEvent("tt-queue-song", { detail: song }));
  };

  const handleRemoveFromQueue = (songId) => {
    window.dispatchEvent(new CustomEvent("tt-remove-from-queue", { detail: songId }));
  };

  const handleClearQueue = () => {
    window.dispatchEvent(new CustomEvent("tt-clear-queue"));
  };

  const getVisibleSongs = () => songs.slice(0, visibleCount);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-black">
      <header className="flex-shrink-0 z-40 border-b border-[var(--tt-divider)]">
        <Header query={query} setQuery={setQuery} handleSearch={handleSearch} onPlay={handlePlay} onOpenArtist={setSelectedArtistId} />
      </header>

      <main className="flex-1 overflow-hidden">
        <Home
          songs={getVisibleSongs()}
          artists={artists}
          albums={albums}
          topArtists={topArtists}
          historySongs={historySongs}
          recentHistory={recentHistory}
          recommendations={recommendations}
          mixes={mixes}
          isSearchQuery={isSearchQuery}
          onLoadMore={handleLoadMore}
          showLoadMore={songs.length > visibleCount}
          onGoHome={handleGoHome}
          onPlay={handlePlay}
          onQueue={handleAddToQueue}
          currentSongId={currentSong?.id}
          currentSong={currentSong}
          isPlaying={isPlaying}
          queue={queue}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={handleClearQueue}
          isLoading={isLoading}
          error={error}
          selectedArtistId={selectedArtistId}
          onOpenArtist={setSelectedArtistId}
          selectedAlbumId={selectedAlbumId}
          onOpenAlbum={setSelectedAlbumId}
          selectedPlaylist={selectedPlaylist}
          onOpenPlaylist={setSelectedPlaylist}
        />
      </main>
    </div>
  );
}
