"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Plus, Music2 } from "lucide-react";

export default function ArtistView({ artistId, onClose, onPlay, onQueue, currentSongId, isPlaying, onOpenAlbum }) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
        if (!apiKey) throw new Error("API key is missing.");

        const headers = {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "deezerdevs-deezer.p.rapidapi.com",
        };

        const artistRes = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/artist/${artistId}`, { headers });
        if (!artistRes.ok) throw new Error("Failed to fetch artist data");
        const artistData = await artistRes.json();

        const searchRes = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(artistData.name)}&limit=100`, { headers });
        const searchData = await searchRes.json();

        const artistTracks = (searchData.data || []).filter(t => t.artist.id === parseInt(artistId));

        const uniqueAlbumsMap = new Map();
        const seenTitles = new Set();
        
        artistTracks.forEach(track => {
          if (track.album) {

            let baseTitle = track.album.title.toLowerCase();

            baseTitle = baseTitle.replace(/[\(\[].*?[\)\]]/g, '').split(' - ')[0].trim();

            if (baseTitle.includes("karaoke") || baseTitle.includes("instrumental")) return;

            if (baseTitle && !seenTitles.has(baseTitle)) {
              seenTitles.add(baseTitle);
              uniqueAlbumsMap.set(track.album.id, track.album);
            }
          }
        });

        setArtist(artistData);
        setTopTracks(artistTracks.slice(0, 15)); // Top 15 tracks
        setAlbums(Array.from(uniqueAlbumsMap.values())); // Show all extracted albums

      } catch (err) {
        console.error(err);
        setError("Failed to load artist profile.");
      } finally {
        setIsLoading(false);
      }
    };

    if (artistId) {
      fetchArtistData();
    }
  }, [artistId]);

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-6 min-h-[400px]">
        <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
        <p className="text-neutral-400 font-medium animate-pulse">Loading artist profile...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-400">{error || "Artist not found"}</p>
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

  const formatNumber = (num) => {
    if (!num) return "0";
    return num.toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar bg-[#121212] relative h-full">
      
      <div className="relative h-64 md:h-80 w-full overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent z-10" />
        <img 
          src={artist.picture_xl || artist.picture_big} 
          alt={artist.name}
          className="w-full h-full object-cover opacity-60 blur-[2px] scale-105"
        />
        
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-8">
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 p-2 bg-black/40 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-md"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-end gap-6">
            <img 
              src={artist.picture_xl || artist.picture_big} 
              alt={artist.name}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full shadow-2xl border-4 border-white/10"
            />
            <div className="flex flex-col gap-2">
              <span className="text-white/80 font-medium text-sm tracking-widest uppercase flex items-center gap-1">
                Verified Artist
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-tight">
                {artist.name}
              </h1>
              <p className="text-neutral-300 text-sm md:text-base font-medium">
                {formatNumber(artist.nb_fan)} fans
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col gap-10">
        
        {topTracks.length > 0 && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onPlay(topTracks[0])}
              className="bg-green-500 hover:bg-green-400 text-black p-4 rounded-full transition-transform hover:scale-105 shadow-xl shadow-green-500/20"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          </div>
        )}

        {topTracks.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Popular Tracks</h2>
            <div className="flex flex-col gap-1">
              {topTracks.map((track, idx) => {
                const isActive = currentSongId === track.id;
                return (
                  <div 
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 group transition cursor-pointer"
                    onClick={() => onPlay(track)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-500 w-4 text-right text-sm font-medium">
                        {isActive && isPlaying ? (
                          <Music2 className="w-4 h-4 text-green-400 animate-pulse" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <img src={track.album?.cover_small} alt="" className="w-10 h-10 rounded" />
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isActive ? 'text-green-400' : 'text-white'}`}>
                          {track.title}
                        </span>
                        <span className="text-neutral-400 text-xs">{track.album?.title}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onQueue(track);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition p-2"
                        title="Add to Queue"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <span className="text-neutral-400 text-sm">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {albums.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {albums.map(album => (
                <div 
                  key={album.id} 
                  onClick={() => onOpenAlbum && onOpenAlbum(album.id)}
                  className="p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition group cursor-pointer"
                >
                  <div className="relative w-full aspect-square mb-4">
                    <img src={album.cover_medium} alt={album.title} className="w-full h-full object-cover rounded-lg shadow-lg" />
                  </div>
                  <h3 className="font-semibold text-white truncate">{album.title}</h3>
                  <p className="text-neutral-400 text-sm truncate">{album.release_date ? album.release_date.split('-')[0] : 'Album'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
