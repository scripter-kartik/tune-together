"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Plus, Music2, Users } from "lucide-react";

export default function ArtistView({ artistId, onClose, onPlay, onQueue, currentSongId, isPlaying, onOpenAlbum }) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!artistId) return;

    let isMounted = true;
    const fetchArtistData = async () => {
      setIsLoading(true);
      setError(null);
      setImgError(false);
      try {
        const res = await fetch(`/api/artist?id=${encodeURIComponent(artistId)}`);
        if (!res.ok) throw new Error("Failed to fetch artist details");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (isMounted) {
          setArtist(data);
          setTopTracks(data.topSongs || []);
          setAlbums(data.topAlbums || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching artist data:", err);
          setError("Could not load artist details. Please try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchArtistData();
    return () => { isMounted = false; };
  }, [artistId]);

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
        <div className="w-14 h-14 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <p className="text-neutral-400 font-medium animate-pulse">Loading artist...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-400">{error || "Artist not found"}</p>
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

  const artistImg = artist.picture_xl || artist.picture_big || artist.picture_medium || '/icon2.png';

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">

      {/* Hero banner */}
      <div className="relative h-56 md:h-80 w-full overflow-hidden flex-shrink-0">
        {!imgError ? (
          <img
            src={artistImg}
            alt={artist.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center">
            <Users className="w-24 h-24 text-neutral-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
          <p className="text-white/70 text-xs font-bold tracking-widest uppercase mb-1">Verified Artist</p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-lg">
            {artist.name}
          </h1>
          {artist.nb_fan && (
            <p className="text-neutral-300 text-sm mt-2">{Number(artist.nb_fan).toLocaleString()} monthly listeners</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 md:px-8 py-6 flex items-center gap-4">
        {topTracks.length > 0 && (
          <button
            onClick={() => onPlay(topTracks[0])}
            className="w-14 h-14 bg-green-500 hover:bg-green-400 hover:scale-105 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-500/25"
          >
            <Play className="w-6 h-6 fill-black ml-0.5" />
          </button>
        )}
      </div>

      <div className="px-6 md:px-8 flex flex-col gap-10 pb-12">

        {/* Top Tracks */}
        {topTracks.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>
            <div className="flex flex-col">
              {topTracks.map((track, idx) => {
                const isActive = currentSongId === track.id;
                const cover = track.album?.cover_medium || track.album?.cover_small || '/icon2.png';
                return (
                  <div
                    key={track.id || idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg group cursor-pointer transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    onClick={() => onPlay(track)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-neutral-500 w-5 text-right text-sm select-none flex-shrink-0">
                        {isActive && isPlaying ? (
                          <Music2 className="w-4 h-4 text-green-400 animate-pulse" />
                        ) : (
                          <span className={`group-hover:hidden ${isActive ? 'hidden' : ''}`}>{idx + 1}</span>
                        )}
                        {!isActive && (
                          <Play className="w-4 h-4 hidden group-hover:block text-white fill-white" />
                        )}
                      </span>
                      <img
                        src={cover}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        onError={e => { e.target.src = '/icon2.png'; }}
                      />
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${isActive ? 'text-green-400' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-neutral-400 text-xs truncate">{track.album?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); onQueue(track); }}
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
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Discography</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {albums.map((album, i) => (
                <div
                  key={album.id || i}
                  onClick={() => onOpenAlbum && onOpenAlbum(album.id)}
                  className="group p-3 bg-[#181818] hover:bg-[#282828] rounded-xl cursor-pointer transition-all duration-200"
                >
                  <div className="relative w-full aspect-square mb-3">
                    <img
                      src={album.cover_medium || '/icon2.png'}
                      alt={album.title}
                      className="w-full h-full object-cover rounded-lg shadow-lg group-hover:scale-[1.02] transition-transform duration-200"
                      onError={e => { e.target.src = '/icon2.png'; }}
                    />
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-lg">
                      <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-white text-sm truncate">{album.title}</h3>
                  <p className="text-neutral-400 text-xs mt-0.5">{album.release_date ? String(album.release_date).split('-')[0] : 'Album'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
