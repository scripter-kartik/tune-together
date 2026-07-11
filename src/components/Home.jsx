'use client'

import { useState, useEffect } from "react";
import MusicCards from "./MusicCards";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel from "./RightPanel";
import ChatView from "./ChatView";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import { Menu, X, Play } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const FEATURED_CATEGORIES = [
  { label: "Top Hits India", query: "top hits india 2024", gradient: "from-pink-600 to-rose-700", emoji: "🇮🇳" },
  { label: "Bollywood Party", query: "bollywood party 2024", gradient: "from-amber-500 to-orange-600", emoji: "🎉" },
  { label: "International Pop", query: "international pop 2024", gradient: "from-purple-600 to-indigo-700", emoji: "🌍" },
  { label: "Chill Vibes", query: "chill lofi vibes", gradient: "from-cyan-600 to-blue-700", emoji: "🌊" },
  { label: "Hip-Hop Bangers", query: "hip hop bangers 2024", gradient: "from-yellow-500 to-amber-600", emoji: "🎤" },
  { label: "Late Night Jazz", query: "late night jazz", gradient: "from-indigo-600 to-violet-700", emoji: "🎷" },
  { label: "Workout Mode", query: "workout motivation music", gradient: "from-red-600 to-rose-600", emoji: "💪" },
  { label: "K-Pop Hits", query: "kpop hits 2024", gradient: "from-emerald-500 to-teal-600", emoji: "🇰🇷" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HomeFeed({ songs, onPlay, onQueue, currentSongId, isPlaying, onOpenArtist, isLoading }) {
  const { user } = useUser();
  const greeting = getGreeting();
  const featured = songs.slice(0, 8);
  const moreSongs = songs.slice(8);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-6 animate-fade-up">
        <div className="h-9 w-64 bg-neutral-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-800 rounded-md animate-pulse" style={{ animationDelay: `${i * 0.04}s` }} />
          ))}
        </div>
        <div className="h-6 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-square bg-neutral-800 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.04}s` }} />
              <div className="h-3 w-3/4 bg-neutral-800 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-neutral-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 pb-8 animate-fade-up">
      {/* Greeting */}
      <h1 className="text-2xl md:text-3xl font-bold text-white">
        {greeting}{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>

      {/* Quick-play shelf */}
      {featured.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {featured.map(song => {
            const isActive = currentSongId === song.id;
            return (
              <div
                key={song.id}
                onClick={() => onPlay(song)}
                className={`relative flex items-center gap-0 rounded-md cursor-pointer group overflow-hidden transition-all duration-200 hover:bg-white/15 ${isActive ? 'bg-white/20 ring-1 ring-green-500/50' : 'bg-white/5'}`}
              >
                <img
                  src={song.album?.cover_medium || '/icon2.png'}
                  alt={song.title}
                  onError={e => { e.target.src = '/icon2.png'; }}
                  className="w-14 h-14 flex-shrink-0 object-cover"
                />
                <span className={`text-sm font-semibold truncate px-3 flex-1 ${isActive ? 'text-green-400' : 'text-white'}`}>
                  {song.title}
                </span>
                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Browse Categories */}
      <section>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Browse Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {FEATURED_CATEGORIES.map(cat => (
            <div
              key={cat.label}
              onClick={() => { window.location.href = `/?q=${encodeURIComponent(cat.query)}`; }}
              className={`relative overflow-hidden rounded-xl cursor-pointer h-24 bg-gradient-to-br ${cat.gradient} hover:scale-[1.03] hover:brightness-110 transition-all duration-200 group shadow-lg`}
            >
              <span className="absolute top-3 left-3 text-white font-bold text-sm md:text-base leading-tight drop-shadow">{cat.label}</span>
              <span className="absolute bottom-2 right-3 text-3xl drop-shadow-lg">{cat.emoji}</span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      {/* Recommended songs */}
      {moreSongs.length > 0 && (
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Recommended for you</h2>
          <MusicCards
            songs={moreSongs}
            onPlay={onPlay}
            onQueue={onQueue}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onOpenArtist={onOpenArtist}
          />
        </section>
      )}
    </div>
  );
}

export default function Home({
  songs, artists = [], albums = [], isSearchQuery = false,
  onLoadMore, showLoadMore, onPlay, onQueue, currentSongId, isPlaying,
  queue, onRemoveFromQueue, onClearQueue, isLoading, error, roomId, socketRef,
  onOpenChat, selectedChatUser, selectedArtistId, onOpenArtist, selectedAlbumId, onOpenAlbum,
}) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const openDrawer = () => setShowRight(true);
    window.addEventListener("tt-open-queue", openDrawer);
    return () => window.removeEventListener("tt-open-queue", openDrawer);
  }, []);

  const renderMain = () => {
    if (selectedChatUser) {
      return (
        <div className="flex-1 overflow-y-auto">
          <ChatView user={selectedChatUser} onClose={() => onOpenChat(null)} />
        </div>
      );
    }
    if (selectedAlbumId) {
      return (
        <AlbumView
          albumId={selectedAlbumId}
          onClose={() => onOpenAlbum(null)}
          onPlay={onPlay}
          onQueue={onQueue}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onOpenArtist={onOpenArtist}
        />
      );
    }
    if (selectedArtistId) {
      return (
        <ArtistView
          artistId={selectedArtistId}
          onClose={() => onOpenArtist(null)}
          onPlay={onPlay}
          onQueue={onQueue}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onOpenAlbum={onOpenAlbum}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {error && (
          <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/30 text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar">
          {isSearchQuery ? (
            /* --- SEARCH RESULTS VIEW --- */
            <div className="flex flex-col gap-8 pt-4 md:pt-6">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="aspect-square bg-neutral-800 rounded-lg animate-pulse" />
                      <div className="h-3 w-3/4 bg-neutral-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {artists.length > 0 && (
                    <section className="px-4 md:px-6">
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Artists</h2>
                      <div className="flex overflow-x-auto pb-4 gap-4 md:gap-5 scrollbar-hide">
                        {artists.slice(0, 10).map(artist => (
                          <div
                            key={artist.id}
                            onClick={() => onOpenArtist(artist.id)}
                            className="flex-shrink-0 w-32 md:w-40 flex flex-col items-center gap-3 cursor-pointer group p-3 hover:bg-white/5 rounded-xl transition-all duration-300"
                          >
                            <div className="relative">
                              <img
                                src={artist.picture_medium || '/icon2.png'}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.target.src = '/icon2.png'; }}
                              />
                              <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-green-500/30 translate-y-2 group-hover:translate-y-0">
                                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-white font-semibold text-sm block truncate w-full">{artist.name}</span>
                              <span className="text-neutral-400 text-xs">Artist</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {albums.length > 0 && (
                    <section className="px-4 md:px-6">
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Albums</h2>
                      <div className="flex overflow-x-auto pb-4 gap-4 md:gap-5 scrollbar-hide">
                        {albums.slice(0, 10).map(album => (
                          <div
                            key={album.id}
                            onClick={() => onOpenAlbum(album.id)}
                            className="flex-shrink-0 w-36 md:w-44 flex flex-col gap-3 cursor-pointer group p-3 hover:bg-white/5 rounded-xl transition-all duration-300"
                          >
                            <div className="relative">
                              <img
                                src={album.cover_medium || '/icon2.png'}
                                className="w-full aspect-square rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300 object-cover"
                                onError={e => { e.target.src = '/icon2.png'; }}
                              />
                              <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-green-500/30 translate-y-2 group-hover:translate-y-0">
                                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                              </div>
                            </div>
                            <div>
                              <span className="text-white font-semibold text-sm block truncate">{album.title}</span>
                              <span className="text-neutral-400 text-xs block truncate">{album.artist?.name || 'Album'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {songs.length > 0 && (
                    <section className="pb-6">
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-2 px-4 md:px-6">Songs</h2>
                      <MusicCards
                        songs={songs}
                        onPlay={onPlay}
                        onQueue={onQueue}
                        currentSongId={currentSongId}
                        isPlaying={isPlaying}
                        onOpenArtist={onOpenArtist}
                      />
                    </section>
                  )}
                </>
              )}
            </div>
          ) : (
            /* --- HOME FEED VIEW --- */
            <HomeFeed
              songs={songs}
              onPlay={onPlay}
              onQueue={onQueue}
              currentSongId={currentSongId}
              isPlaying={isPlaying}
              onOpenArtist={onOpenArtist}
              isLoading={isLoading}
            />
          )}
        </div>

        {showLoadMore && !isSearchQuery && (
          <div className="flex-shrink-0 p-4 flex justify-center border-t border-neutral-800">
            <button
              onClick={onLoadMore}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-2 rounded-full transition text-sm"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-0 md:gap-2 p-0 md:p-2 bg-black overflow-hidden">

      {/* Mobile top bar */}
      <div className="flex md:hidden gap-2 p-2 bg-[#121212] border-b border-neutral-800 flex-shrink-0">
        <button
          onClick={() => setShowLeft(!showLeft)}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Menu size={15} /><span>Library</span>
        </button>
        <button
          onClick={() => setShowRight(!showRight)}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Menu size={15} /><span>Queue</span>
        </button>
      </div>

      {/* Left sidebar - desktop */}
      <div className="hidden md:flex md:w-72 lg:w-80 flex-shrink-0 bg-[#121212] rounded-xl overflow-hidden flex-col h-full">
        <PlaylistSidebar onOpenChat={onOpenChat} />
      </div>

      {/* Mobile left drawer */}
      {showLeft && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLeft(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#121212] shadow-2xl flex flex-col z-50 overflow-hidden pb-[105px] animate-slide-left">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h3 className="text-white font-bold">Your Library</h3>
              <button onClick={() => setShowLeft(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PlaylistSidebar onOpenChat={onOpenChat} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 bg-gradient-to-b from-[#1a1a2e] via-[#121212] to-[#121212] rounded-xl flex flex-col min-w-0 overflow-hidden h-full">
        {renderMain()}
      </div>

      {/* Right panel - desktop */}
      <div className="hidden md:flex md:w-72 lg:w-80 flex-shrink-0 bg-[#121212] rounded-xl overflow-hidden flex-col h-full">
        <RightPanel
          roomId={roomId}
          socketRef={socketRef}
          queue={queue}
          onRemoveFromQueue={onRemoveFromQueue}
          onClearQueue={onClearQueue}
        />
      </div>

      {/* Mobile right drawer */}
      {showRight && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowRight(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#121212] shadow-2xl flex flex-col z-50 overflow-hidden pb-[105px] animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h3 className="text-white font-bold">Queue & Room</h3>
              <button onClick={() => setShowRight(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RightPanel
                roomId={roomId}
                socketRef={socketRef}
                queue={queue}
                onRemoveFromQueue={onRemoveFromQueue}
                onClearQueue={onClearQueue}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}