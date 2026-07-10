"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Plus, Music2 } from "lucide-react";

export default function AlbumView({ albumId, onClose, onPlay, onQueue, currentSongId, isPlaying, onOpenArtist }) {
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
        if (!apiKey) throw new Error("API key is missing.");

        const headers = {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
        };

        const res = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/album/${albumId}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch album data");

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        setAlbum(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load album profile.");
      } finally {
        setIsLoading(false);
      }
    };

    if (albumId) {
      fetchAlbumData();
    }
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
        <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
        <p className="text-neutral-400 font-medium animate-pulse">Loading album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-400">{error || "Album not found"}</p>
        <button onClick={onClose} className="bg-[#1e1e1e] px-4 py-2 rounded text-white hover:bg-[#2a2a2a] transition">
          Go Back
        </button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getFullTrack = (track) => {
    return {
      ...track,
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover,
        cover_small: album.cover_small,
        cover_medium: album.cover_medium,
        cover_big: album.cover_big,
        cover_xl: album.cover_xl,
      }
    };
  };

  const tracks = album.tracks?.data || [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">
      
      <div className="relative w-full overflow-hidden flex-shrink-0 bg-gradient-to-b from-[#282828] to-[#121212] pt-24 pb-8 px-6 md:px-8">
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 bg-black/40 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-md z-20"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col md:flex-row items-end gap-6 relative z-10">
          <img 
            src={album.cover_xl || album.cover_big || album.cover_medium} 
            alt={album.title}
            className="w-48 h-48 md:w-60 md:h-60 rounded shadow-2xl"
          />
          <div className="flex flex-col gap-2">
            <span className="text-white/80 font-medium text-sm tracking-widest uppercase">
              Album
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-tight line-clamp-2">
              {album.title}
            </h1>
            <div className="flex items-center gap-2 text-neutral-300 text-sm md:text-base font-medium mt-2">
              {album.artist && (
                <div 
                  className="flex items-center gap-2 hover:underline cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenArtist) onOpenArtist(album.artist.id);
                  }}
                >
                  {album.artist.picture_small && (
                    <img src={album.artist.picture_small} alt={album.artist.name} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="font-bold text-white group-hover:text-green-400">{album.artist.name}</span>
                </div>
              )}
              <span>•</span>
              <span>{album.release_date?.split('-')[0]}</span>
              <span>•</span>
              <span>{tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col gap-8">
        {tracks.length > 0 && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onPlay(getFullTrack(tracks[0]))}
              className="bg-green-500 hover:bg-green-400 text-black p-4 rounded-full transition-transform hover:scale-105 shadow-xl shadow-green-500/20"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="flex flex-col gap-1 pb-20">
            {tracks.map((track, idx) => {
              const isActive = currentSongId === track.id;
              const fullTrack = getFullTrack(track);
              return (
                <div 
                  key={track.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 group transition cursor-pointer"
                  onClick={() => onPlay(fullTrack)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500 w-6 text-right text-sm font-medium">
                      {isActive && isPlaying ? (
                        <Music2 className="w-4 h-4 text-green-400 animate-pulse ml-2" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isActive ? 'text-green-400' : 'text-white'}`}>
                        {track.title}
                      </span>
                      <span className="text-neutral-400 text-xs">
                        {track.artist?.name || album.artist?.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onQueue(fullTrack);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition p-2"
                      title="Add to Queue"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <span className="text-neutral-400 text-sm w-10 text-right">{formatTime(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
