"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Plus, Music2, Disc } from "lucide-react";

export default function AlbumView({ albumId, onClose, onPlay, onQueue, currentSongId, isPlaying, onOpenArtist }) {
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    const fetchAlbumData = async () => {
      setIsLoading(true);
      setError(null);
      setImgError(false);
      try {
        const res = await fetch(`/api/album?id=${encodeURIComponent(albumId)}`);
        if (!res.ok) throw new Error("Failed to fetch album data");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAlbum(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load album.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlbumData();
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
        <div className="w-14 h-14 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <p className="text-neutral-400 font-medium animate-pulse">Loading album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-400">{error || "Album not found"}</p>
        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-white font-semibold text-sm transition">
          Go Back
        </button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const tracks = album.songs || [];
  const coverUrl = album.cover_xl || album.cover_big || album.cover_medium || '/icon2.png';

  const getFullTrack = (track) => ({
    ...track,
    album: {
      id: album.id,
      title: album.title,
      cover_medium: coverUrl,
      cover_small: coverUrl,
      cover_big: coverUrl,
    }
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">

      {/* Header */}
      <div className="relative bg-gradient-to-b from-[#282828] to-[#121212] pt-16 pb-8 px-6 md:px-8">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-shrink-0 shadow-2xl shadow-black/60">
            {!imgError ? (
              <img
                src={coverUrl}
                alt={album.title}
                className="w-44 h-44 md:w-56 md:h-56 rounded shadow-2xl object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-44 h-44 md:w-56 md:h-56 rounded bg-neutral-800 flex items-center justify-center">
                <Disc className="w-16 h-16 text-neutral-600" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Album</p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight line-clamp-2">
              {album.title}
            </h1>
            <div className="flex items-center gap-2 text-neutral-300 text-sm mt-2 flex-wrap">
              {album.artist && (
                <span
                  className="font-bold text-white hover:underline cursor-pointer"
                  onClick={() => onOpenArtist && onOpenArtist(album.artist.id)}
                >
                  {album.artist.name}
                </span>
              )}
              {album.release_date && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{String(album.release_date).split('-')[0]}</span>
                </>
              )}
              <span className="text-neutral-500">•</span>
              <span>{tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Tracks */}
      <div className="px-6 md:px-8 py-4 flex flex-col gap-6 pb-12">

        {tracks.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => onPlay(getFullTrack(tracks[0]))}
              className="w-14 h-14 bg-green-500 hover:bg-green-400 hover:scale-105 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-500/25"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>
          </div>
        )}

        {/* Track list */}
        {tracks.length > 0 && (
          <div className="flex flex-col">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto] gap-4 px-3 py-2 border-b border-white/10 mb-2">
              <span className="text-neutral-400 text-xs font-medium w-5 text-right">#</span>
              <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Title</span>
              <span className="text-neutral-400 text-xs font-medium tabular-nums">⏱</span>
            </div>

            {tracks.map((track, idx) => {
              const isActive = currentSongId === track.id;
              const fullTrack = getFullTrack(track);
              return (
                <div
                  key={track.id || idx}
                  className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-3 py-2.5 rounded-lg group cursor-pointer transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  onClick={() => onPlay(fullTrack)}
                >
                  <span className="text-neutral-500 w-5 text-right text-sm select-none">
                    {isActive && isPlaying ? (
                      <Music2 className="w-4 h-4 text-green-400 animate-pulse" />
                    ) : (
                      <>
                        <span className={`group-hover:hidden ${isActive ? 'hidden' : ''}`}>{idx + 1}</span>
                        <Play className={`w-4 h-4 text-white fill-white hidden ${!isActive ? 'group-hover:block' : ''}`} />
                      </>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${isActive ? 'text-green-400' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-neutral-400 text-xs truncate">{track.artist?.name || album.artist?.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onQueue(fullTrack); }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition p-1"
                      title="Add to Queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-neutral-400 text-sm tabular-nums">{formatTime(track.duration)}</span>
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
