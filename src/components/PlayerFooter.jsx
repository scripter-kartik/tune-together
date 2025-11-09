// src/components/PlayerFooter.jsx

"use client";
import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { BsFillVolumeUpFill, BsFillVolumeMuteFill } from "react-icons/bs";
import { useUpdateNowPlaying } from "@/hooks/useActivityTracker";

const DRIFT_TOLERANCE = 0.25;

export default function PlayerFooter({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  roomId,
  socketRef,
  hasSongs,
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSeeking = useRef(false);

  const { updateNowPlaying } = useUpdateNowPlaying();

  const setTime = (t) => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = Math.max(0, t || 0);
    } catch {}
  };

  // Update now playing status when song or play state changes
  useEffect(() => {
    if (!song || !isPlaying) {
      updateNowPlaying(null);
      return;
    }

    updateNowPlaying({
      id: song.id,
      title: song.title,
      artist: {
        name: song.artist.name
      },
      album: {
        cover_small: song.album.cover_small
      }
    });
  }, [song, isPlaying, updateNowPlaying]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !song) return;

    const onPlay = ({ isPlaying, position, at }) => {
      const a = audioRef.current;
      if (!a) return;
      const posNow = (position ?? 0) + (Date.now() - (at || Date.now())) / 1000;
      setTime(posNow);
      if (isPlaying) a.play().catch(() => {});
      else a.pause();
    };

    const onSong = ({ song: s, isPlaying, position, at }) => {
      const a = audioRef.current;
      if (!a || !s) return;
      if (a.src !== s.preview) {
        setIsLoading(true);
        a.src = s.preview;
        a.load();
      }
      const posNow = (position ?? 0) + (Date.now() - (at || Date.now())) / 1000;
      setTime(posNow);
      if (isPlaying) a.play().catch(() => {});
      else a.pause();
    };

    const onSeek = ({ position, at }) => {
      const posNow = (position ?? 0) + (Date.now() - (at || Date.now())) / 1000;
      setTime(posNow);
    };

    socket.on("sync-play", onPlay);
    socket.on("sync-song", onSong);
    socket.on("sync-seek", onSeek);

    const onTTSync = (e) => {
      const d = e.detail || {};
      if (d.type === "state" || d.type === "song") {
        onSong({ song, isPlaying: d.isPlaying, position: d.position, at: d.at });
      } else if (d.type === "play") {
        onPlay({ isPlaying: d.isPlaying, position: d.position, at: d.at });
      } else if (d.type === "seek") {
        onSeek({ position: d.position, at: d.at });
      }
    };
    window.addEventListener("tt-sync", onTTSync);

    return () => {
      socket.off("sync-play", onPlay);
      socket.off("sync-song", onSong);
      socket.off("sync-seek", onSeek);
      window.removeEventListener("tt-sync", onTTSync);
    };
  }, [socketRef, song]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !song) return;

    if (a.src !== song.preview) {
      setIsLoading(true);
      a.src = song.preview;
      a.load();
    }

    const handleLoadedMetadata = () => {
      setDuration(a.duration || 30);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(a.currentTime);
    const handleEnded = () => onNext();
    const handleError = (e) => {
      console.error("Audio error:", e);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);

    a.addEventListener("loadedmetadata", handleLoadedMetadata);
    a.addEventListener("timeupdate", handleTimeUpdate);
    a.addEventListener("ended", handleEnded);
    a.addEventListener("error", handleError);
    a.addEventListener("canplay", handleCanPlay);

    if (isPlaying) {
      a.play().catch(() => setIsLoading(false));
    } else {
      a.pause();
    }

    return () => {
      a.removeEventListener("loadedmetadata", handleLoadedMetadata);
      a.removeEventListener("timeupdate", handleTimeUpdate);
      a.removeEventListener("ended", handleEnded);
      a.removeEventListener("error", handleError);
      a.removeEventListener("canplay", handleCanPlay);
    };
  }, [song, isPlaying, onNext]);

  useEffect(() => {
    const id = setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      if (Number.isNaN(a.currentTime)) setTime(0);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    const socket = socketRef.current;
    if (!a || !socket || !roomId || !song) return;

    const position = a.currentTime || 0;
    socket.emit("toggle-play", { roomId, isPlaying, position });
  }, [isPlaying, roomId, socketRef]);

  const handleSeek = (e) => {
    if (!song) return;
    const newTime = parseFloat(e.target.value);
    isSeeking.current = true;

    const a = audioRef.current;
    if (a) {
      setTime(newTime);
      setCurrentTime(newTime);
      socketRef.current?.emit("seek-time", {
        roomId,
        position: newTime,
      });
    }
    setTimeout(() => {
      isSeeking.current = false;
    }, 100);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isMuted) {
      a.volume = volume;
      setIsMuted(false);
    } else {
      a.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#181818] to-[#1e1e1e] text-white px-2 sm:px-3 md:px-4 py-5 sm:py-3 flex flex-col gap-2 sm:gap-3 border-t border-neutral-800 z-50">
      
      {/* Progress Bar */}
      <div className="flex items-center gap-1 sm:gap-2 w-full">
        <span className="text-xs text-gray-400 flex-shrink-0 mr-2 w-7 sm:w-8 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 30}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className={`flex-1 h-1 accent-green-500 cursor-pointer rounded ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Seek"
          disabled={!song}
        />
        <span className="text-xs ml-2 text-gray-400 flex-shrink-0 w-7 sm:w-8 text-left">{formatTime(Math.max(duration - currentTime, 0))}</span>
      </div>

      {/* Main Row - Song Info | Controls | Volume */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full justify-between">
        
        {/* Song Info - Left */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-[0.3]">
          {song ? (
            <>
              <img 
                src={song.album.cover_small} 
                alt={song.title} 
                className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded shadow-lg flex-shrink-0" 
              />
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-xs sm:text-xs md:text-sm font-medium truncate">{song.title}</span>
                <span className="text-xs text-gray-400 truncate">{song.artist.name}</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded bg-neutral-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-xs sm:text-xs md:text-sm font-medium text-gray-400 truncate">
                  {hasSongs ? "Select song" : "Loading..."}
                </span>
                <span className="text-xs text-gray-500 truncate">Start listening</span>
              </div>
            </>
          )}
        </div>

        {/* Player Controls - Center */}
        <div className="flex gap-3 sm:gap-4 md:gap-5 items-center justify-center flex-1 md:flex-[0.4]">
          <button 
            onClick={onPrev} 
            className={`text-gray-300 hover:text-green-400 transition flex-shrink-0 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Previous"
            disabled={!song}
          >
            <FaBackward size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          
          <button
            onClick={onPlayPause}
            className={`bg-white text-black p-1.5 sm:p-1.5 md:p-2 rounded-full hover:scale-110 hover:bg-green-400 transition flex-shrink-0 shadow-lg ${(!song || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!song || isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <FaPause size={13} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            ) : (
              <FaPlay size={13} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ml-0.5" />
            )}
          </button>
          
          <button 
            onClick={onNext} 
            className={`text-gray-300 hover:text-green-400 transition flex-shrink-0 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Next"
            disabled={!song}
          >
            <FaForward size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Volume Controls - Right */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 flex-1 md:flex-[0.3] justify-end">
          <button 
            onClick={toggleMute} 
            className="hover:text-green-400 transition flex-shrink-0 text-gray-300" 
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <BsFillVolumeMuteFill size={16} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            ) : (
              <BsFillVolumeUpFill size={16} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-12 sm:w-14 md:w-20 accent-green-500 cursor-pointer h-1 rounded flex-shrink-0"
            aria-label="Volume"
          />
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}