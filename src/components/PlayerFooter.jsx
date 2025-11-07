// src/components/PlayerFooter.jsx

"use client";
import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { BsFillVolumeUpFill, BsFillVolumeMuteFill } from "react-icons/bs";

const DRIFT_TOLERANCE = 0.25; // seconds

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

  // helper to set audio time safely
  const setTime = (t) => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = Math.max(0, t || 0);
    } catch {}
  };

  // Apply socket sync events (play/pause/song/seek) with timestamp
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

    // Also listen to page's tt-sync custom events (late-join state propagation)
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

  // Load / switch track locally when song changes
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

    // reflect prop isPlaying
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

  // Drift correction loop
  useEffect(() => {
    const id = setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      if (Number.isNaN(a.currentTime)) setTime(0);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Emit play/pause with accurate timestamp when UI toggles
  useEffect(() => {
    const a = audioRef.current;
    const socket = socketRef.current;
    if (!a || !socket || !roomId || !song) return;

    const position = a.currentTime || 0;
    socket.emit("toggle-play", { roomId, isPlaying, position });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="fixed bottom-0 left-0 right-0 bg-[#181818] text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between z-50 border-t border-neutral-800 gap-2">
      {/* Song Info */}
      <div className="flex items-center gap-4 w-full md:w-[30%]">
        {song ? (
          <>
            <img src={song.album.cover_small} alt={song.title} className="w-14 h-14 rounded shadow-lg" />
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-medium truncate">{song.title}</span>
              <span className="text-xs text-gray-400 truncate">{song.artist.name}</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded bg-neutral-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-medium text-gray-400">
                {hasSongs ? "Select a song to play" : "Loading music..."}
              </span>
              <span className="text-xs text-gray-500">Start listening now</span>
            </div>
          </>
        )}
      </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center w-full md:w-[40%]">
        <div className="flex gap-6 items-center justify-center mb-1">
          <button 
            onClick={onPrev} 
            className={`text-gray-300 hover:text-white transition ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Previous"
            disabled={!song}
          >
            <FaBackward size={16} />
          </button>
          <button
            onClick={onPlayPause}
            className={`bg-white text-black p-2 rounded-full hover:scale-105 transition ${(!song || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!song || isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <FaPause size={16} />
            ) : (
              <FaPlay size={16} />
            )}
          </button>
          <button 
            onClick={onNext} 
            className={`text-gray-300 hover:text-white transition ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Next"
            disabled={!song}
          >
            <FaForward size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-1 accent-green-500 ${!song ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Seek"
            disabled={!song}
          />
          <span className="text-xs text-gray-400 w-10 text-left">{formatTime(Math.max(duration - currentTime, 0))}</span>
        </div>
      </div>

      {/* Volume Controls */}
      <div className="w-full md:w-[30%] flex justify-center md:justify-end items-center gap-3">
        <button onClick={toggleMute} className="hover:text-green-500 transition" aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted || volume === 0 ? <BsFillVolumeMuteFill size={20} /> : <BsFillVolumeUpFill size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 accent-green-500 cursor-pointer"
          aria-label="Volume"
        />
      </div>

      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}