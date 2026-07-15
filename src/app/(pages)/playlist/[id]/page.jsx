"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import PlayerFooter from "../../../../components/PlayerFooter";
import { FaPlay, FaPause, FaShuffle } from "react-icons/fa6";
import { IoMdTime } from "react-icons/io";
import { getSocket } from "../../../../lib/socket";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { Menu, X, Plus, Check } from "lucide-react";
import { useActivityTracker } from "../../../../hooks/useActivityTracker"; // ADD THIS IMPORT
import { PLAYLISTS } from "../../../../lib/constants";

function PlaylistSidebarContent({ currentId }) {
  return (
    <>
      {PLAYLISTS.map((playlist) => (
        <Link
          key={playlist.id}
          href={`/playlist/${playlist.id}?name=${encodeURIComponent(playlist.name)}&artist=${encodeURIComponent(playlist.artist)}&gradient=${encodeURIComponent(playlist.gradient)}`}
        >
          <div className={`flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition cursor-pointer group ${currentId === playlist.id ? "bg-[#1a1a1a]" : ""}`}>
            <img src={playlist.image} alt={playlist.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className={`text-sm font-medium truncate transition ${currentId === playlist.id ? "text-green-400" : "text-white group-hover:text-green-400"}`}>
                {playlist.name}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {playlist.type} • {playlist.artist}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function PlaylistPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roomId, setRoomId] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showLeft, setShowLeft] = useState(false);
  const [addedId, setAddedId] = useState(null);
  const socketRef = useRef(null);
  const router = useRouter();

  // Redirect to home if user starts typing a global search
  useEffect(() => {
    if (query.trim() !== "") {
      const timer = setTimeout(() => {
        router.push(`/?q=${encodeURIComponent(query)}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query, router]);

  const playlistName = searchParams.get("name") || "Playlist";
  const artist = searchParams.get("artist") || "Various Artists";
  const gradient = searchParams.get("gradient") || "from-purple-600 to-blue-600";

  useActivityTracker(songs[currentSongIndex]);

  useEffect(() => {
    let room = searchParams.get("room");
    if (!room) {
      room = uuidv4();
      const url = new URL(window.location);
      url.searchParams.set("room", room);
      window.history.replaceState({}, "", url);
    }
    setRoomId(room);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socketRef.current = socket;
    socket.emit("join-room", roomId);

    socket.on("sync-song", (data) => {
      const idx = songs.findIndex((s) => s.id === data.song?.id);
      if (idx !== -1) setCurrentSongIndex(idx);
      setIsPlaying(!!data.isPlaying);
    });

    socket.on("sync-play", (data) => setIsPlaying(!!data.isPlaying));

    return () => socket.disconnect();
  }, [roomId, songs]);

  useEffect(() => {
    const fetchSongs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(artist)}`);
        if (!response.ok) throw new Error("Failed to load playlist");
        const data = await response.json();
        if (data?.songs?.length) {
          setSongs(data.songs.slice(0, 26));
          setCurrentSongIndex(0);
        }
      } catch (err) {
        console.error("Error fetching:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, [artist]);

  const handlePlaySong = (song, index) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    socketRef.current?.emit("change-song", { roomId, song, position: 0 });
  };

  const handleQueue = (song) => {
    socketRef.current?.emit("add-to-queue", { roomId, song });
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const handlePlayAll = () => handlePlaySong(songs[0], 0);
  
  const handleShuffle = () => {
    const i = Math.floor(Math.random() * songs.length);
    handlePlaySong(songs[i], i);
  };

  const handleTogglePlayPause = () => {
    setIsPlaying((prev) => !prev);
    socketRef.current?.emit("toggle-play", { roomId, isPlaying: !isPlaying });
  };

  const handleMainPlayPause = () => {
    if (isPlaying) {
      handleTogglePlayPause();
    } else {
      if (currentSongIndex !== null) {
        handleTogglePlayPause();
      } else {
        handlePlayAll();
      }
    }
  };

  const handleNext = () => {
    const next = (currentSongIndex + 1) % songs.length;
    handlePlaySong(songs[next], next);
  };
  
  const handlePrev = () => {
    const prev = (currentSongIndex - 1 + songs.length) % songs.length;
    handlePlaySong(songs[prev], prev);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black overflow-hidden">
      <Header query={query} setQuery={setQuery} handleSearch={() => {
        if (query.trim() !== "") {
          router.push(`/?q=${encodeURIComponent(query)}`);
        }
      }} />

      <div className="flex lg:hidden p-2 bg-black border-b border-neutral-800 flex-shrink-0">
        <button
          onClick={() => setShowLeft(true)}
          className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white px-3 py-2 rounded-md text-sm"
        >
          <Menu size={18} />
          Playlists
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 overflow-hidden">
        <div className="hidden lg:flex lg:w-80 flex-shrink-0 overflow-hidden rounded-md">
          <div className="flex flex-col h-full w-full bg-[#121212] rounded-md overflow-hidden">
            <div className="flex items-center px-4 py-4 gap-3 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Playlists</h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
              <PlaylistSidebarContent currentId={params.id} />
            </div>
          </div>
        </div>

        {showLeft && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden">
            <div className="absolute inset-0" onClick={() => setShowLeft(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#121212] rounded-r-lg shadow-lg z-50 overflow-y-auto flex flex-col">
              <div className="flex justify-between items-center p-3 border-b border-neutral-800 flex-shrink-0">
                <h2 className="text-white font-semibold">Playlists</h2>
                <button onClick={() => setShowLeft(false)} className="p-1 hover:bg-[#222] rounded">
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <PlaylistSidebarContent currentId={params.id} />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-md">
          <div className="flex-1 overflow-y-auto">
            <div className={`bg-gradient-to-b ${gradient} to-black px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 flex-shrink-0`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mt-4 sm:mt-0">
                <div className="w-40 h-40 sm:w-40 sm:h-40 md:w-56 md:h-56 bg-black/20 rounded shadow-xl overflow-hidden flex-shrink-0">
                  <img src={songs[0]?.album?.cover_xl || songs[0]?.album?.cover_medium || "/icon2.png"} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 pb-2 sm:pb-4 text-center sm:text-left mt-2 sm:mt-0">
                  <p className="text-xs sm:text-sm text-white mb-1 uppercase tracking-wider font-bold">Album</p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-3 line-clamp-2">
                    {playlistName}
                  </h1>

                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1 text-white text-xs sm:text-sm">
                    <span>{artist}</span>•<span>{songs.length} songs</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black px-3 sm:px-6 py-4 sm:py-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 sm:gap-6 pb-6 flex-shrink-0">
                  <button
                    onClick={handleMainPlayPause}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 hover:scale-105 transition shadow-lg flex-shrink-0"
                  >
                    {isPlaying ? (
                      <FaPause className="text-black text-lg sm:text-2xl" />
                    ) : (
                      <FaPlay className="text-black text-lg sm:text-2xl ml-1" />
                    )}
                  </button>
                  <button onClick={handleShuffle} className="text-gray-400 hover:text-white text-lg sm:text-xl transition">
                    <FaShuffle />
                  </button>
                </div>

                <div className="hidden md:grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 border-b border-gray-800 text-gray-400 text-sm flex-shrink-0">
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div>Released</div>
                  <div className="text-right">
                    <IoMdTime className="text-lg" />
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-20 text-gray-400">Loading...</div>
                ) : (
                  <div className="space-y-1">
                    {songs.map((song, index) => (
                      <div
                        key={song.id}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => handlePlaySong(song, index)}
                        className={`
                          grid 
                          grid-cols-[16px_1fr_auto]
                          md:grid-cols-[16px_4fr_2fr_1fr]
                          gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3
                          rounded cursor-pointer
                          hover:bg-white/10
                          transition
                          ${currentSongIndex === index ? "bg-white/10" : ""}
                        `}
                      >
                        <div className="flex items-center justify-center">
                          {hoveredIndex === index || currentSongIndex === index ? (
                            <FaPlay className="text-white text-xs" />
                          ) : (
                            <span className={currentSongIndex === index ? "text-green-500" : "text-gray-400"}>
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <img src={song.album?.cover_small || song.album?.cover_medium || "/icon2.png"} className="w-8 h-8 sm:w-10 sm:h-10 rounded flex-shrink-0" />
                          <div className="overflow-hidden min-w-0">
                            <p className={`text-xs sm:text-sm truncate ${currentSongIndex === index ? "text-green-500" : "text-white"}`}>
                              {song.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{song.artist?.name || "Unknown Artist"}</p>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center text-sm text-gray-400">2024</div>

                        <div className="flex items-center justify-end gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQueue(song); }}
                            className={`transition p-1 ${addedId === song.id ? "text-green-400 opacity-100" : "text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100"}`}
                            title="Add to queue"
                          >
                            {addedId === song.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex-shrink-0 z-50 bg-black border-t border-neutral-800">
        <PlayerFooter
          song={songs[currentSongIndex] ?? null}
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