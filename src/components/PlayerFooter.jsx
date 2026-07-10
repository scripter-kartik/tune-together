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
    if (!socket) return;

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
      if (d.type === "state") {
        onSong({ song: d.currentSong, isPlaying: d.isPlaying, position: d.position, at: d.at });
      } else if (d.type === "song") {
        onSong({ song: d.song, isPlaying: d.isPlaying, position: d.position, at: d.at });
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

  const handlePlayPauseClick = () => {
    const a = audioRef.current;
    const nextPlaying = !isPlaying;
    if (roomId && socketRef.current && song) {
      socketRef.current.emit("toggle-play", {
        roomId,
        isPlaying: nextPlaying,
        position: a?.currentTime || 0,
      });
    }
    onPlayPause();
  };

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
    <div className="w-full bg-[#121212]/80 backdrop-blur-xl border-t border-white/5 text-white px-3 md:px-4 flex flex-col md:flex-row items-center justify-between h-[70px] md:h-[90px] shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)]">

      <div className="md:hidden absolute top-0 left-0 right-0">
        <div className="flex items-center w-full">
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-1 appearance-none bg-neutral-800 cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Seek"
            disabled={!song}
            style={{
              background: `linear-gradient(to right, #1db954 ${(currentTime / (duration || 30)) * 100}%, #262626 ${(currentTime / (duration || 30)) * 100}%)`
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between w-full h-full">

        <div className="flex items-center gap-3 md:gap-4 w-[65%] md:w-[30%] min-w-0">
          {song ? (
            <>
              <div className="relative flex-shrink-0 rounded flex items-center shadow-lg shadow-black/50">
                <img
                  src={song.album.cover_small}
                  alt={song.title}
                  className="w-12 h-12 md:w-14 md:h-14 object-cover rounded shadow-md"
                />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0 justify-center">
                <span className="text-[13px] md:text-[14px] font-normal truncate hover:underline cursor-pointer text-white">{song.title}</span>
                <span className="text-[11px] md:text-[12px] text-[#b3b3b3] truncate hover:underline cursor-pointer hover:text-white transition-colors">{song.artist.name}</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#121212]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            </>
          )}
        </div>

        <div className="hidden md:flex flex-col items-center justify-center w-[40%] max-w-[722px] gap-2">
          <div className="flex items-center gap-6">
            <button 
              onClick={onPrev} 
              className={`text-[#b3b3b3] hover:text-white transition-colors ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Previous"
              disabled={!song}
            >
              <FaBackward size={16} />
            </button>
            
            <button
              onClick={handlePlayPauseClick}
              className={`bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-all ${(!song || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!song || isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <FaPause size={14} />
              ) : (
                <FaPlay size={14} className="ml-1" />
              )}
            </button>
            
            <button 
              onClick={onNext} 
              className={`text-[#b3b3b3] hover:text-white transition-colors ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Next"
              disabled={!song}
            >
              <FaForward size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full group">
            <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px] text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 30}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className={`flex-1 h-1 appearance-none bg-[#4d4d4d] rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Seek"
              disabled={!song}
              style={{
                background: `linear-gradient(to right, ${song ? '#ffffff' : '#4d4d4d'} ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`
              }}
              onMouseEnter={(e) => {
                if(song) e.target.style.background = `linear-gradient(to right, #1db954 ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`;
              }}
              onMouseLeave={(e) => {
                if(song) e.target.style.background = `linear-gradient(to right, #ffffff ${(currentTime / (duration || 30)) * 100}%, #4d4d4d ${(currentTime / (duration || 30)) * 100}%)`;
              }}
            />
            <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px]">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex md:hidden items-center justify-end gap-4 w-[35%]">
          <button
            onClick={handlePlayPauseClick}
            className={`text-white p-2 ${(!song || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!song || isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <FaPause size={20} />
            ) : (
              <FaPlay size={20} />
            )}
          </button>
          <button 
            onClick={onNext} 
            className={`text-neutral-300 hover:text-white transition-colors p-2 ${!song ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Next"
            disabled={!song}
          >
            <FaForward size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center justify-end gap-2 w-[30%] min-w-[180px] group">
          <button 
            onClick={toggleMute} 
            className="text-[#b3b3b3] hover:text-white transition-colors" 
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <BsFillVolumeMuteFill size={16} />
            ) : (
              <BsFillVolumeUpFill size={16} />
            )}
          </button>
          <div className="w-[93px] flex items-center group/vol">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 appearance-none bg-[#4d4d4d] rounded-full cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover/vol:[&::-webkit-slider-thumb]:opacity-100"
              aria-label="Volume"
              style={{
                background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`
              }}
              onMouseEnter={(e) => {
                e.target.style.background = `linear-gradient(to right, #1db954 ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #4d4d4d ${(isMuted ? 0 : volume) * 100}%)`;
              }}
            />
          </div>
        </div>

      </div>

      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}