"use client";
import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaForward, FaBackward } from "react-icons/fa";
import { BsFillVolumeUpFill } from "react-icons/bs";

export default function PlayerFooter({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastSongUrlRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;

    if (audio.src !== song.preview) {
      audio.src = song.preview;
      lastSongUrlRef.current = song.preview;
    }

    const handleLoadedMetadata = () => setDuration(audio.duration || 30);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    if (isPlaying) {
      audio
        .play()
        .catch((err) => console.warn("Autoplay blocked:", err.message));
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [song, isPlaying]);

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (!song) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#181818] text-white px-4 py-3 flex items-center justify-between z-50 border-t border-neutral-800">
      <div className="flex items-center gap-4 w-[30%]">
        <img
          src={song.album.cover_small}
          alt={song.title}
          className="w-14 h-14 rounded shadow-lg"
        />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate">{song.title}</span>
          <span className="text-xs text-gray-400 truncate">
            {song.artist.name}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center w-[40%]">
        <div className="flex gap-6 items-center justify-center mb-1">
          <button onClick={onPrev} className="text-gray-300 hover:text-white">
            <FaBackward size={16} />
          </button>
          <button
            onClick={onPlayPause}
            className="bg-white text-black p-2 rounded-full hover:scale-105 transition"
          >
            {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
          </button>
          <button onClick={onNext} className="text-gray-300 hover:text-white">
            <FaForward size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 accent-green-500"
          />
          <span className="text-xs text-gray-400 w-10 text-left">
            {formatTime(duration - currentTime)}
          </span>
        </div>
      </div>

      <div className="w-[30%] flex justify-end items-center gap-3 pr-4">
        <BsFillVolumeUpFill />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="1"
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.volume = parseFloat(e.target.value);
            }
          }}
          className="w-24 accent-green-500"
        />
      </div>

      <audio ref={audioRef} onEnded={onNext} />
    </div>
  );
}
