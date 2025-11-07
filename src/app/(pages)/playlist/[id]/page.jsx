// src/app/playlist/[id]/page.jsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "../../../../components/Header";
import PlayerFooter from "../../../../components/PlayerFooter";
import { FaPlay, FaPause, FaShuffle } from "react-icons/fa6";
import { BsThreeDots } from "react-icons/bs";
import { IoMdTime } from "react-icons/io";
import { getSocket } from "../../../../lib/socket";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

// Playlist sidebar content component
function PlaylistSidebarContent({ currentId }) {
    const playlists = [
        { id: "1", name: "Old is <3", type: "Album", artist: "Ram :)", gradient: "from-purple-600 to-blue-600" },
        { id: "2", name: "Arijit Singh All time hits", type: "Album", artist: "Arijit Singh", gradient: "from-red-600 to-orange-600" },
        { id: "3", name: "Best of Shreya Ghoshal", type: "Album", artist: "Shreya Ghoshal", gradient: "from-blue-500 to-cyan-500" },
        { id: "4", name: "Highlights of honey singh", type: "Album", artist: "Yo yo honey singh", gradient: "from-purple-500 to-pink-500" },
        { id: "5", name: "Golden Songs of Kishore Kumar", type: "Album", artist: "Kishore Kumar", gradient: "from-teal-500 to-green-600" },
        { id: "6", name: "Madness of Badshah", type: "Album", artist: "Badshah", gradient: "from-indigo-600 to-purple-600" },
        { id: "7", name: "Charlie Puth Hits of 2024", type: "Album", artist: "Charlie Puth", gradient: "from-pink-500 to-rose-600" },
    ];

    return (
        <>
            {playlists.map((playlist) => (
                <Link
                    key={playlist.id}
                    href={`/playlist/${playlist.id}?name=${encodeURIComponent(playlist.name)}&artist=${encodeURIComponent(playlist.artist)}&gradient=${encodeURIComponent(playlist.gradient)}`}
                >
                    <div className={`flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition cursor-pointer group ${currentId === playlist.id ? 'bg-[#1a1a1a]' : ''}`}>
                        <div className="relative w-14 h-14 flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className={`text-sm font-medium truncate transition ${currentId === playlist.id ? 'text-green-400' : 'text-white group-hover:text-green-400'}`}>
                                {playlist.name}
                            </p>
                            <p className="text-gray-400 text-xs truncate">{playlist.type} • {playlist.artist}</p>
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
    const socketRef = useRef(null);

    const playlistName = searchParams.get("name") || "Playlist";
    const artist = searchParams.get("artist") || "Various Artists";
    const gradient = searchParams.get("gradient") || "from-purple-600 to-blue-600";

    // Initialize room
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let room = params.get("room");
        if (!room) {
            room = uuidv4();
            const url = new URL(window.location);
            url.searchParams.set("room", room);
            window.history.replaceState({}, "", url);
        }
        setRoomId(room);
    }, []);

    // Socket connection
    useEffect(() => {
        if (!roomId) return;
        const socket = getSocket();
        socketRef.current = socket;

        const onConnect = () => {
            socket.emit("join-room", roomId);
        };
        socket.on("connect", onConnect);

        socket.on("sync-song", (data) => {
            const idx = songs.findIndex((s) => s.id === data.song?.id);
            if (idx !== -1) setCurrentSongIndex(idx);
            setIsPlaying(!!data.isPlaying);
        });

        socket.on("sync-play", (data) => {
            setIsPlaying(!!data.isPlaying);
        });

        return () => {
            socket.off("connect", onConnect);
        };
    }, [roomId, songs]);

    // Fetch songs
    useEffect(() => {
        const fetchSongs = async () => {
            setIsLoading(true);
            try {
                const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
                const response = await fetch(
                    `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(
                        artist
                    )}`,
                    {
                        method: "GET",
                        headers: {
                            "X-RapidAPI-Key": apiKey,
                            "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
                        },
                    }
                );

                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    setSongs(data.data.slice(0, 26));
                    setCurrentSongIndex(0);
                }
            } catch (err) {
                console.error("Error fetching songs:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSongs();
    }, [artist]);

    const handleSearch = () => {
        if (query.trim() !== "") {
            window.location.href = `/?search=${encodeURIComponent(query)}`;
        }
    };

    const handlePlayAll = () => {
        if (songs.length > 0) {
            setCurrentSongIndex(0);
            setIsPlaying(true);
            socketRef.current?.emit("change-song", {
                roomId,
                song: songs[0],
                position: 0,
            });
        }
    };

    const handleShuffle = () => {
        if (songs.length > 0) {
            const randomIndex = Math.floor(Math.random() * songs.length);
            setCurrentSongIndex(randomIndex);
            setIsPlaying(true);
            socketRef.current?.emit("change-song", {
                roomId,
                song: songs[randomIndex],
                position: 0,
            });
        }
    };

    const handlePlaySong = (song, index) => {
        setCurrentSongIndex(index);
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

    const handleNext = () => {
        if (songs.length === 0) return;
        const nextIndex = (currentSongIndex + 1) % songs.length;
        setCurrentSongIndex(nextIndex);
        setIsPlaying(true);
        socketRef.current?.emit("next-song", { roomId, song: songs[nextIndex] });
    };

    const handlePrev = () => {
        if (songs.length === 0) return;
        const prevIndex =
            (currentSongIndex - 1 + songs.length) % songs.length;
        setCurrentSongIndex(prevIndex);
        setIsPlaying(true);
        socketRef.current?.emit("prev-song", { roomId, song: songs[prevIndex] });
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-black scrollbar overflow-y-auto">
            <Header query={query} setQuery={setQuery} handleSearch={handleSearch} />

            <div className="px-2 py-2 flex flex-col lg:flex-row gap-2 flex-1 overflow-hidden">
                {/* Playlist Sidebar - Left */}
                <div className="hidden lg:block lg:w-80 h-[calc(100vh-160px)] rounded-md">
                    <div className="flex flex-col h-full bg-[#121212] rounded-md overflow-hidden">
                        <div className="flex items-center px-4 py-4 gap-3 border-b border-gray-800">
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                            </svg>
                            <h2 className="text-lg font-bold text-white">Playlist's</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent px-2 py-2">
                            <PlaylistSidebarContent currentId={params.id} />
                        </div>
                    </div>
                </div>

                {/* Main Content - Middle (Playlist Detail) */}
                <div className="flex-1 h-[calc(100vh-160px)] overflow-hidden rounded-md">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {/* Hero Section with Gradient - fades to black */}
                        <div className={`bg-gradient-to-b ${gradient} to-black px-6 pt-6 pb-6`}>
                            <div className="flex items-end gap-6 max-w-7xl mx-auto">
                                {/* Album Art */}
                                <div className="w-56 h-56 bg-black/20 rounded shadow-2xl flex-shrink-0 overflow-hidden">
                                    {songs.length > 0 && songs[0]?.album?.cover_xl ? (
                                        <img
                                            src={songs[0].album.cover_xl}
                                            alt={playlistName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <svg
                                                className="w-24 h-24 text-white/50"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Album Info */}
                                <div className="flex-1 pb-6">
                                    <p className="text-sm font-semibold text-white mb-2">Album</p>
                                    <h1 className="text-6xl font-bold text-white mb-6 drop-shadow-lg">
                                        {playlistName}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <span className="font-semibold">{artist}</span>
                                        <span>•</span>
                                        <span>{songs.length} songs</span>
                                        <span>•</span>
                                        <span>2024</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls & Song List */}
                        <div className="bg-black px-6 pb-32">
                            <div className="max-w-7xl mx-auto">
                                {/* Action Buttons */}
                                <div className="flex items-center gap-6 py-6">
                                    <button
                                        onClick={handlePlayAll}
                                        className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 hover:scale-105 transition shadow-lg"
                                    >
                                        {isPlaying && currentSongIndex === 0 ? (
                                            <FaPause className="text-black text-xl ml-0" />
                                        ) : (
                                            <FaPlay className="text-black text-xl ml-1" />
                                        )}
                                    </button>

                                    <button
                                        onClick={handleShuffle}
                                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition"
                                    >
                                        <FaShuffle className="text-2xl" />
                                    </button>

                                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition">
                                        <BsThreeDots className="text-2xl" />
                                    </button>
                                </div>

                                {/* Song Table Header */}
                                <div className="grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 border-b border-gray-800 text-gray-400 text-sm mb-2">
                                    <div className="text-center">#</div>
                                    <div>Title</div>
                                    <div>Released Year</div>
                                    <div className="text-right flex items-center justify-end">
                                        <IoMdTime className="text-lg" />
                                    </div>
                                </div>

                                {/* Song List */}
                                {isLoading ? (
                                    <div className="text-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
                                        <p className="text-gray-400">Loading songs...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {songs.map((song, index) => (
                                            <div
                                                key={song.id}
                                                onMouseEnter={() => setHoveredIndex(index)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                                onClick={() => handlePlaySong(song, index)}
                                                className={`grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-3 rounded hover:bg-white/10 cursor-pointer group ${currentSongIndex === index ? "bg-white/10" : ""
                                                    }`}
                                            >
                                                {/* Track Number / Play Button */}
                                                <div className="flex items-center justify-center">
                                                    {hoveredIndex === index || currentSongIndex === index ? (
                                                        currentSongIndex === index && isPlaying ? (
                                                            <div className="w-4 h-4 flex items-center justify-center">
                                                                <div className="flex gap-0.5">
                                                                    <div className="w-1 h-3 bg-green-500 animate-pulse" />
                                                                    <div
                                                                        className="w-1 h-3 bg-green-500 animate-pulse"
                                                                        style={{ animationDelay: "0.2s" }}
                                                                    />
                                                                    <div
                                                                        className="w-1 h-3 bg-green-500 animate-pulse"
                                                                        style={{ animationDelay: "0.4s" }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <FaPlay className="text-white text-xs" />
                                                        )
                                                    ) : (
                                                        <span
                                                            className={`text-sm ${currentSongIndex === index
                                                                    ? "text-green-500"
                                                                    : "text-gray-400"
                                                                }`}
                                                        >
                                                            {index + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <img
                                                        src={song.album.cover_small}
                                                        alt={song.title}
                                                        className="w-10 h-10 rounded"
                                                    />
                                                    <div className="overflow-hidden">
                                                        <p
                                                            className={`text-sm font-medium truncate ${currentSongIndex === index
                                                                    ? "text-green-500"
                                                                    : "text-white"
                                                                }`}
                                                        >
                                                            {song.title}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {song.artist.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Release Date */}
                                                <div className="flex items-center text-sm text-gray-400">
                                                    {song.release_date ? formatDate(song.release_date) : "2024-11-19"}
                                                </div>

                                                {/* Duration */}
                                                <div className="flex items-center justify-end text-sm text-gray-400">
                                                    {formatDuration(song.duration)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Player Footer */}
                    <PlayerFooter
                        song={
                            currentSongIndex !== null && songs[currentSongIndex]
                                ? songs[currentSongIndex]
                                : null
                        }
                        isPlaying={isPlaying}
                        onPlayPause={handleTogglePlayPause}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        roomId={roomId}
                        socketRef={socketRef}
                        hasSongs={songs.length > 0}
                    />
                </div>
            </div>
        </div>
    );
}