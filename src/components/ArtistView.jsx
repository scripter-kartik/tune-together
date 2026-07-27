"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Plus, Music2, Users, Check, BadgeCheck } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

export default function ArtistView({ artistId, onClose, onPlay, onQueue, currentSongId, isPlaying, onOpenAlbum, onOpenArtist }) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [singles, setSingles] = useState([]);
  const [similarArtists, setSimilarArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

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
          setSingles(data.topSingles || []);
          setSimilarArtists(data.similarArtists || []);
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
        <p className="text-neutral-400 font-medium animate-pulse">Loading artist profile...</p>
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

  const artistImg = resolveCover(artist.picture_xl || artist.picture_big || artist.picture_medium, artist.name || artist.id);

  const AlbumGrid = ({ items, title }) => {
    if (!items || items.length === 0) return null;
    return (
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div
              key={`${item.id || "album"}-${i}`}
              onClick={() => onOpenAlbum && onOpenAlbum(item.id)}
              className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-xl cursor-pointer transition-all duration-300"
            >
              <div className="relative w-full aspect-square mb-4">
                <img
                  src={resolveCover(item.cover_medium, item.title || item.id)}
                  alt={item.title}
                  className="w-full h-full object-cover rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.5)] group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition-all duration-300"
                  onError={coverError(item.title || item.id)}
                />
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl hover:bg-green-400 hover:scale-105">
                  <Play className="w-5 h-5 fill-black text-black ml-1" />
                </div>
              </div>
              <h3 className="font-semibold text-white text-base truncate mb-1">{item.title}</h3>
              <p className="text-neutral-400 text-sm truncate">{item.release_date ? String(item.release_date).split('-')[0] : (title === 'Singles & EPs' ? 'Single' : 'Album')}</p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-[#121212] relative h-full">
      {/* Hero Header */}
      <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full flex-shrink-0">
        <div className="absolute inset-0 z-0">
          {!imgError ? (
            <img
              src={artistImg}
              alt={artist.name}
              className="w-full h-full object-cover object-top"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center">
              <Users className="w-24 h-24 text-neutral-700" />
            </div>
          )}
        </div>
        
        {/* Gradient overlays for smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-black/20 z-10" />

        <button
          onClick={onClose}
          className="absolute top-6 left-6 p-2.5 bg-black/40 hover:bg-black/80 rounded-full text-white transition-all backdrop-blur-md z-30"
          title="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20 flex flex-col justify-end h-full">
          <div className="flex items-center gap-2 mb-2 text-white">
            <BadgeCheck className="w-6 h-6 text-blue-400 fill-blue-400/20" />
            <span className="text-sm font-semibold tracking-wide shadow-black drop-shadow-md">Verified Artist</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-4 shadow-black drop-shadow-lg line-clamp-2">
            {artist.name}
          </h1>
          {artist.nb_fan && (
            <p className="text-white/90 text-sm md:text-base font-medium shadow-black drop-shadow-md">
              {Number(artist.nb_fan).toLocaleString()} monthly listeners
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 md:px-8 bg-gradient-to-b from-black/60 to-[#121212] pb-16 min-h-screen">
        
        {/* Sticky-ish Actions Bar */}
        <div className="py-6 flex items-center gap-6">
          {topTracks.length > 0 && (
            <button
              onClick={() => onPlay(topTracks[0], topTracks)}
              className="w-14 h-14 md:w-16 md:h-16 bg-green-500 hover:bg-green-400 hover:scale-105 text-black rounded-full flex items-center justify-center transition-all duration-200 shadow-xl shadow-green-900/30"
            >
              <Play className="w-6 h-6 md:w-7 md:h-7 fill-black ml-1" />
            </button>
          )}
          <button 
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full border border-neutral-400 text-white font-bold text-sm tracking-widest uppercase hover:border-white hover:scale-105 transition-all duration-200 ${isFollowing ? 'border-white text-white' : ''}`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Top Tracks */}
        {topTracks.length > 0 && (
          <section className="mt-4">
            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Popular</h2>
            <div className="flex flex-col gap-1">
              {topTracks.map((track, idx) => {
                const isActive = currentSongId === track.id;
                const cover = resolveCover(track.album?.cover_medium || track.album?.cover_small, track.title || track.id);
                return (
                  <div
                    key={`${track.id || "track"}-${idx}`}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-md group cursor-pointer transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/10'}`}
                    onClick={() => onPlay(track, topTracks)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-neutral-400 w-6 text-center text-sm font-medium select-none flex-shrink-0 group-hover:hidden">
                        {isActive && isPlaying ? (
                          <Music2 className="w-4 h-4 text-green-500 animate-pulse mx-auto" />
                        ) : (
                          <span className={isActive ? 'text-green-500' : ''}>{idx + 1}</span>
                        )}
                      </span>
                      <span className="w-6 text-center text-sm flex-shrink-0 hidden group-hover:flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </span>
                      <img
                        src={cover}
                        alt={track.title}
                        className="w-10 h-10 rounded-sm object-cover flex-shrink-0"
                        onError={coverError(track.title || track.id)}
                      />
                      <div className="min-w-0 pr-4">
                        <p className={`font-semibold text-base truncate ${isActive ? 'text-green-500' : 'text-white'}`}>
                          {track.title}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-6 flex-shrink-0 w-32">
                      <button
                        onClick={(e) => { e.stopPropagation(); onQueue(track); }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition-all p-1"
                        title="Add to Queue"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <span className="text-neutral-400 text-sm font-medium tabular-nums">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <AlbumGrid items={albums} title="Discography" />
        <AlbumGrid items={singles} title="Singles & EPs" />

        {/* Similar Artists */}
        {similarArtists.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Fans also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {similarArtists.map((simArtist, i) => (
                <div
                  key={`${simArtist.id || "artist"}-${i}`}
                  onClick={() => onOpenArtist && onOpenArtist(simArtist.id)}
                  className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-xl cursor-pointer transition-all duration-300 text-center"
                >
                  <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                    <img
                      src={resolveCover(simArtist.picture_medium, simArtist.name || simArtist.id)}
                      alt={simArtist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={coverError(simArtist.name || simArtist.id)}
                    />
                  </div>
                  <h3 className="font-semibold text-white text-base truncate mb-1">{simArtist.name}</h3>
                  <p className="text-neutral-400 text-sm truncate">Artist</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
