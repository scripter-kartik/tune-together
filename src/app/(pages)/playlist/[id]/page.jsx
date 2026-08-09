"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import { FaPlay, FaPause } from "react-icons/fa6";
import { IoMdTime } from "react-icons/io";
import { Plus, Check, Music2, ListMusic } from "lucide-react";
import { resolveCover, coverError } from "../../../../lib/coverPlaceholder";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0];
}

// Standalone public playlist page (linked from user profiles). Reads the real
// playlist from the API — not the hardcoded presets — and plays through the
// global player footer via custom events, so the player keeps working.
export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [addedId, setAddedId] = useState(null);

  const id = params?.id;

  useEffect(() => {
    if (query.trim() !== "") {
      const timer = setTimeout(() => {
        router.push(`/?q=${encodeURIComponent(query)}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query, router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);
    fetch(`/api/playlists/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success) setPlaylist(data.playlist);
        else setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const onGlobalState = (e) => {
      const { currentSong: gSong, isPlaying: gIsPlaying } = e.detail;
      if (gSong !== undefined) setCurrentSong(gSong);
      if (gIsPlaying !== undefined) setIsPlaying(gIsPlaying);
    };
    window.addEventListener("tt-global-state", onGlobalState);
    window.dispatchEvent(new CustomEvent("tt-request-global-state"));
    return () => window.removeEventListener("tt-global-state", onGlobalState);
  }, []);

  const songs = playlist?.songs || [];
  const currentSongIndex = currentSong ? songs.findIndex((s) => s.id === currentSong.id) : -1;

  const handlePlaySong = (song) => {
    window.dispatchEvent(new CustomEvent("tt-play-song", { detail: { song, list: songs } }));
  };

  const handleQueue = (song) => {
    window.dispatchEvent(new CustomEvent("tt-queue-song", { detail: song }));
    setAddedId(song.id);
    setTimeout(() => setAddedId((cur) => (cur === song.id ? null : cur)), 1200);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) handlePlaySong(songs[0]);
  };

  const handleMainPlayPause = () => {
    if (songs.length === 0) return;
    if (currentSongIndex === -1) {
      handlePlayAll();
    } else {
      window.dispatchEvent(
        new CustomEvent("tt-player-command", { detail: { action: isPlaying ? "pause" : "play" } })
      );
    }
  };

  const coverUrl = resolveCover(playlist?.image, playlist?.name || "Playlist");
  const owner = playlist?.owner;

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden">
      <Header
        query={query}
        setQuery={setQuery}
        handleSearch={() => {
          if (query.trim() !== "") router.push(`/?q=${encodeURIComponent(query)}`);
        }}
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
            <p className="text-neutral-400 animate-pulse">Loading playlist…</p>
          </div>
        ) : notFound || !playlist ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-neutral-400">
            <ListMusic className="w-10 h-10" />
            <p className="text-sm font-medium">Playlist not found.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-2 px-5 py-2 bg-green-500 hover:bg-green-400 text-black text-sm font-bold rounded-full transition-colors"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-b from-purple-600 via-[#3a2d5f] to-black px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mt-4 sm:mt-0">
                {coverUrl ? (
                  <img referrerPolicy="no-referrer"
                    src={coverUrl}
                    alt={playlist.name}
                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded shadow-xl object-cover bg-black/30"
                    onError={coverError(playlist.name || "Playlist")}
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded shadow-xl bg-gradient-to-br from-purple-600 via-[#3a2d5f] to-indigo-600 flex items-center justify-center">
                    <Music2 className="w-16 h-16 sm:w-20 sm:h-20 text-white/80 drop-shadow-lg" />
                  </div>
                )}
                <div className="flex-1 pb-1 text-center sm:text-left min-w-0">
                  <p className="text-xs sm:text-sm text-white/70 mb-1 uppercase tracking-widest font-bold">Playlist</p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white line-clamp-2">
                    {playlist.name}
                  </h1>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1.5 text-white/70 text-xs sm:text-sm mt-2">
                    {owner && (
                      <>
                        <span className="flex items-center gap-1.5 font-semibold text-white">
                          {owner.imageUrl ? (
                            <img referrerPolicy="no-referrer"
                              src={owner.imageUrl}
                              alt={owner.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-bold text-black">
                              {getInitials(owner.name)}
                            </span>
                          )}
                          {owner.name}
                        </span>
                        <span className="text-white/40">•</span>
                      </>
                    )}
                    <span>
                      {songs.length} {songs.length === 1 ? "song" : "songs"}
                    </span>
                    {playlist.isCollaborative && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className="text-green-400 font-semibold">Collaborative</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-3 sm:px-6 py-4 sm:py-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 sm:gap-6 pb-6">
                  <button
                    onClick={handleMainPlayPause}
                    disabled={songs.length === 0}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 hover:scale-105 transition shadow-lg flex-shrink-0 disabled:opacity-40 disabled:hover:scale-100"
                    title={songs.length === 0 ? "No songs yet" : isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying && currentSongIndex !== -1 ? (
                      <FaPause className="text-black text-lg sm:text-2xl" />
                    ) : (
                      <FaPlay className="text-black text-lg sm:text-2xl ml-1" />
                    )}
                  </button>
                </div>

                {songs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-20 text-neutral-500">
                    <ListMusic className="w-10 h-10" />
                    <p className="text-sm">This playlist is empty.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:grid grid-cols-[24px_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-neutral-400 text-sm">
                      <div className="text-center">#</div>
                      <div>Title</div>
                      <div className="flex items-center justify-end gap-2">
                        <IoMdTime className="text-lg" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      {songs.map((song, index) => (
                        <div
                          key={song.id}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() => handlePlaySong(song)}
                          className={`grid grid-cols-[24px_1fr_auto] gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 rounded-lg cursor-pointer transition ${
                            currentSongIndex === index ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {hoveredIndex === index || currentSongIndex === index ? (
                              isPlaying && currentSongIndex === index ? (
                                <Music2 className="text-green-400 w-4 h-4" />
                              ) : (
                                <FaPlay className="text-white text-xs" />
                              )
                            ) : (
                              <span className={currentSongIndex === index ? "text-green-400" : "text-neutral-500"}>
                                {index + 1}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
                            <img referrerPolicy="no-referrer"
                              src={resolveCover(song.album?.cover_small || song.album?.cover_medium, song.title)}
                              onError={coverError(song.title)}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded flex-shrink-0 object-cover"
                              alt=""
                            />
                            <div className="overflow-hidden min-w-0">
                              <p className={`text-xs sm:text-sm truncate ${currentSongIndex === index ? "text-green-400" : "text-white"}`}>
                                {song.title}
                              </p>
                              <p className="text-xs text-neutral-400 truncate">{song.artist?.name || "Unknown Artist"}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-400">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQueue(song); }}
                              className={`transition p-1 rounded ${addedId === song.id ? "text-green-400" : "text-neutral-400 hover:text-white"}`}
                              title="Add to queue"
                            >
                              {addedId === song.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                            <span className="tabular-nums">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
