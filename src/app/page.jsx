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
  const { user, isSignedIn } = useUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isSearchQuery, setIsSearchQuery] = useState(false);
  const [topArtists, setTopArtists] = useState([]);
  const [historySongs, setHistorySongs] = useState([]);
  const socketRef = useRef(null);

  const songsRef = useRef([]);
  const currentSongRef = useRef(null);
  // The ordered list the current song belongs to (album/playlist/collection/
  // artist/feed section). Next/Prev walk THIS list, so playback follows
  // whatever you started it from instead of always the home feed.
  const playContextRef = useRef([]);

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

  const randomTerms = useMemo(
    () => [...terms].sort(() => Math.random() - 0.5).slice(0, 5),
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

        if (currentSongIndex === null && !currentSongRef.current) {
          setCurrentSongIndex(0);
          setCurrentSong(data.songs[0]);
        }
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

  // Home feed: pull from several random topics and mix them so the
  // fresh page isn't flooded with songs from a single genre/mood.
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

      const songs = shuffle(dedupe(results.flatMap((r) => r.songs || [])));
      const artists = dedupe(results.flatMap((r) => r.artists || []));
      const albums = dedupe(results.flatMap((r) => r.albums || []));

      if (songs.length === 0) {
        setError("No results found. Try a different search term.");
        setSongs([]);
        setArtists([]);
        setAlbums([]);
      } else {
        setSongs(songs);
        setArtists(artists);
        setAlbums(albums);
        setVisibleCount(20);
        if (currentSongIndex === null && !currentSongRef.current) {
          setCurrentSongIndex(0);
          setCurrentSong(songs[0]);
        }
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

  // Live search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    // Only trigger if we actually have a debounced query
    if (debouncedQuery.trim() !== "") {
      fetchSongs(debouncedQuery, true);
    } else if (isSearchQuery) {
      // If query is cleared, go back to home feed
      setIsSearchQuery(false);
      fetchHomeFeed(randomTerms);
    }
  }, [debouncedQuery]);

  const handleSearch = () => {
    if (query.trim() !== "") {
      fetchSongs(query, true);
    }
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 20);

  // Return to the home feed: close any open artist/album/chat view and, if the
  // user had searched, drop the query and reload the mixed feed. Preserves the
  // current room (unlike a hard navigation to "/").
  const handleGoHome = () => {
    setSelectedArtistId(null);
    setSelectedAlbumId(null);
    setSelectedPlaylist(null);
    setSelectedChatUser(null);
    if (isSearchQuery || query) {
      setQuery("");
      setIsSearchQuery(false);
      fetchHomeFeed(randomTerms);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const browseQuery = sessionStorage.getItem('browseQuery');
    
    if (urlQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    } else if (browseQuery) {
      setQuery(browseQuery);
      setDebouncedQuery(browseQuery);
      sessionStorage.removeItem('browseQuery');
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

  // Load the user's most-listened artists on sign-in.
  useEffect(() => {
    if (isSignedIn) fetchHistory();
    else {
      setTopArtists([]);
      setHistorySongs([]);
    }
  }, [isSignedIn]);

  // `list` (optional) is the ordered list the song was played from — an album's
  // tracks, a playlist, a feed section, etc. It becomes the context that Next/
  // Prev traverse. Falls back to the current feed when not supplied.
  const handlePlay = (song, list) => {
    const context = Array.isArray(list) && list.length ? list : songs;
    playContextRef.current = context;
    const idx = context.findIndex((s) => s.id === song.id);
    setCurrentSong(song);
    setCurrentSongIndex(idx !== -1 ? idx : null);
    setIsPlaying(true);
    recordPlay(song);
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

  // Resolve the list Next/Prev should traverse: the active playback context if
  // we have one, otherwise the current feed.
  const activeList = () =>
    playContextRef.current?.length ? playContextRef.current : songs;

  const handleNext = () => {
    // An explicit user queue always takes priority (server-managed).
    if (queue.length > 0) {
      socketRef.current?.emit("next-song", { roomId });
      return;
    }
    const list = activeList();
    if (list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const nextIndex = curIdx === -1 ? 0 : (curIdx + 1) % list.length;
    const nextSong = list[nextIndex];
    setCurrentSong(nextSong);
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
    socketRef.current?.emit("next-song", { roomId, song: nextSong });
  };

  const handlePrev = () => {
    const list = activeList();
    if (list.length === 0) return;
    const cur = currentSongRef.current;
    const curIdx = cur ? list.findIndex((s) => s.id === cur.id) : -1;
    const prevIndex = curIdx === -1 ? 0 : (curIdx - 1 + list.length) % list.length;
    const prevSong = list[prevIndex];
    setCurrentSong(prevSong);
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
    socketRef.current?.emit("prev-song", { roomId, song: prevSong });
  };

  const getVisibleSongs = () => songs.slice(0, visibleCount);

  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden bg-black">
      <header className="flex-shrink-0 z-40 border-b border-neutral-800">
        <Header query={query} setQuery={setQuery} handleSearch={handleSearch} roomId={roomId} />
      </header>
      
      <main className="flex-1 overflow-hidden">
        <Home
          songs={getVisibleSongs()}
          artists={artists}
          albums={albums}
          topArtists={topArtists}
          historySongs={historySongs}
          isSearchQuery={isSearchQuery}
          onLoadMore={handleLoadMore}
          showLoadMore={songs.length > visibleCount}
          onGoHome={handleGoHome}
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
          selectedPlaylist={selectedPlaylist}
          onOpenPlaylist={setSelectedPlaylist}
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