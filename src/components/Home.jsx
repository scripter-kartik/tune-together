'use client'

import { useState, useEffect } from "react";
import MusicCards from "./MusicCards";
import FeaturedCards from "./FeaturedCards";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel from "./RightPanel";
import ChatView from "./ChatView";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import CollectionView from "./CollectionView";
import { Menu, X, Play, Shuffle, Music4 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { coverPlaceholder } from "../lib/coverPlaceholder";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night vibes";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

function coverOf(song) {
  return (
    song?.album?.cover_medium ||
    song?.album?.cover_big ||
    song?.album?.cover_small ||
    coverPlaceholder(song?.title || song?.id)
  );
}

/* ------------------------------------------------------------------ *
 * Section header — shared title + optional "Play all" affordance.
 * ------------------------------------------------------------------ */
function SectionHeader({ title, subtitle, onPlayAll }) {
  return (
    <div className="flex items-end justify-between gap-4 px-4 mb-3">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-neutral-400 text-xs md:text-sm mt-0.5 truncate">{subtitle}</p>}
      </div>
      {onPlayAll && (
        <button
          onClick={onPlayAll}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-3.5 py-1.5 transition-colors"
        >
          <Play className="w-3 h-3 fill-current" /> Play all
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero — greeting band with a "spotlight" featured track and a
 * shuffle-play call to action built purely from the current feed.
 * ------------------------------------------------------------------ */
function Hero({ greeting, firstName, spotlight, onPlay, onShuffle, onOpenArtist }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/50 via-[#1d1d2e] to-[#151515] border border-white/5 px-5 py-6 md:px-8 md:py-8">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/80 mb-2">
            Tune Together
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
            {greeting}{firstName ? <span className="text-indigo-300">, {firstName}</span> : ""}
          </h1>
          <p className="text-neutral-300/80 text-sm md:text-base mt-3 max-w-md">
            Pick up where the room left off, or press play and let the queue carry the night.
          </p>
          {onShuffle && (
            <button
              onClick={onShuffle}
              className="mt-5 inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 hover:scale-[1.03] active:scale-100 text-black font-bold text-sm rounded-full pl-4 pr-5 py-2.5 shadow-xl shadow-green-500/25 transition-all"
            >
              <Shuffle className="w-4 h-4" /> Shuffle play
            </button>
          )}
        </div>

        {/* Spotlight track card */}
        {spotlight && (
          <div
            onClick={() => onPlay(spotlight)}
            className="group flex-shrink-0 w-full md:w-72 flex items-center gap-4 rounded-xl bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/5 p-3 cursor-pointer transition-colors"
          >
            <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
              <img
                src={coverOf(spotlight)}
                alt={spotlight.title}
                onError={(e) => { e.target.src = coverPlaceholder(spotlight.title || spotlight.id); }}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-400 mb-1">Today's spotlight</p>
              <p className="text-white font-semibold text-sm truncate">{spotlight.title}</p>
              <p
                className="text-neutral-400 text-xs truncate mt-0.5 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); if (spotlight.artist?.id) onOpenArtist?.(spotlight.artist.id); }}
              >
                {spotlight.artist?.name || "Unknown Artist"}
              </p>
            </div>
            <div className="w-9 h-9 flex-shrink-0 rounded-full bg-green-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-green-500/30">
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeFeed({ songs, artists, albums, topArtists = [], historySongs = [], onPlay, onQueue, currentSongId, isPlaying, onOpenArtist, onOpenAlbum, onOpenCollection, isLoading }) {
  const { user } = useUser();
  const greeting = getGreeting();

  // Carve the feed into non-overlapping bands so each section feels distinct.
  const spotlight = songs[0] || null;
  const freshPicks = songs.slice(1, 13);
  const moreSongs = songs.slice(13);

  const playAll = (list) => {
    if (!list?.length) return;
    onPlay(list[0]);
    if (onQueue) list.slice(1).forEach((s) => onQueue(s));
  };

  const shuffleFeed = () => {
    if (!songs.length) return;
    const i = Math.floor(Math.random() * songs.length);
    onPlay(songs[i]);
    if (onQueue) songs.filter((_, idx) => idx !== i).forEach((s) => onQueue(s));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-6 animate-fade-up">
        <div className="h-32 md:h-40 w-full bg-neutral-800/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 p-3 md:p-4 rounded-xl bg-[#181818]">
              <div className="aspect-square bg-neutral-800 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.04}s` }} />
              <div className="h-3 w-3/4 bg-neutral-800 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-neutral-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nothing to show — friendly empty state.
  if (!songs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <Music4 className="w-7 h-7 text-neutral-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Nothing playing yet</h2>
        <p className="text-neutral-400 text-sm max-w-xs">
          Search for a song, artist, or mood up top to fill your feed and start a listening room.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 pb-10 animate-fade-up">
      <Hero
        greeting={greeting}
        firstName={user?.firstName}
        spotlight={spotlight}
        onPlay={onPlay}
        onShuffle={shuffleFeed}
        onOpenArtist={onOpenArtist}
      />

      {/* Quick shortcut tiles built from the feed */}
      <section>
        <SectionHeader title="Start listening" subtitle="Hand-picked mixes from your feed" />
        <FeaturedCards songs={songs} onPlay={onPlay} onQueue={onQueue} onOpenCollection={onOpenCollection} />
      </section>

      {/* Fresh picks — the meat of the feed */}
      {freshPicks.length > 0 && (
        <section>
          <SectionHeader
            title="Fresh picks for you"
            subtitle="A blend across the moods you love"
            onPlayAll={() => playAll(freshPicks)}
          />
          <MusicCards
            songs={freshPicks}
            onPlay={onPlay}
            onQueue={onQueue}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onOpenArtist={onOpenArtist}
          />
        </section>
      )}

      {/* Your top artists — most listened by the logged-in user */}
      {topArtists.length > 0 && (
        <section>
          <SectionHeader title="Your top artists" subtitle="On heavy rotation lately" />
          <div className="flex overflow-x-auto pb-4 gap-4 md:gap-5 scrollbar-hide px-4">
            {topArtists.map((artist) => (
              <div
                key={artist.id || artist.name}
                onClick={() => artist.id && onOpenArtist?.(artist.id)}
                className={`flex-shrink-0 w-32 md:w-40 flex flex-col items-center gap-3 group p-3 rounded-xl transition-all duration-300 ${artist.id ? "cursor-pointer hover:bg-white/5" : ""}`}
              >
                <div className="relative">
                  <img
                    src={artist.image && artist.image !== "/icon2.png" ? artist.image : coverPlaceholder(artist.name)}
                    alt={artist.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = coverPlaceholder(artist.name); }}
                  />
                  {artist.id && (
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-green-500/30 translate-y-2 group-hover:translate-y-0">
                      <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-white font-semibold text-sm block truncate w-full">{artist.name}</span>
                  <span className="text-neutral-400 text-xs">{artist.count} play{artist.count === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Songs by your top artists */}
      {historySongs.length > 0 && (
        <section>
          <SectionHeader
            title="Because you've been listening"
            subtitle="More from the artists you keep coming back to"
            onPlayAll={() => playAll(historySongs)}
          />
          <MusicCards
            songs={historySongs}
            onPlay={onPlay}
            onQueue={onQueue}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onOpenArtist={onOpenArtist}
          />
        </section>
      )}

      {/* Everything else */}
      {moreSongs.length > 0 && (
        <section>
          <SectionHeader title="More to explore" onPlayAll={() => playAll(moreSongs)} />
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
  songs, artists = [], albums = [], topArtists = [], historySongs = [], isSearchQuery = false,
  onLoadMore, showLoadMore, onPlay, onQueue, currentSongId, isPlaying,
  queue, onRemoveFromQueue, onClearQueue, isLoading, error, roomId, socketRef,
  onOpenChat, selectedChatUser, selectedArtistId, onOpenArtist, selectedAlbumId, onOpenAlbum,
}) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    const openDrawer = () => setShowRight(true);
    window.addEventListener("tt-open-queue", openDrawer);
    return () => window.removeEventListener("tt-open-queue", openDrawer);
  }, []);

  const renderMain = () => {
    if (selectedCollection) {
      return (
        <CollectionView
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
          onPlay={onPlay}
          onQueue={onQueue}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onOpenArtist={onOpenArtist}
        />
      );
    }
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
                                src={artist.picture_medium || coverPlaceholder(artist.name)}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.target.src = coverPlaceholder(artist.name); }}
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
                                src={album.cover_medium || coverPlaceholder(album.title)}
                                className="w-full aspect-square rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300 object-cover"
                                onError={e => { e.target.src = coverPlaceholder(album.title); }}
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
              artists={artists}
              albums={albums}
              topArtists={topArtists}
              historySongs={historySongs}
              onPlay={onPlay}
              onQueue={onQueue}
              currentSongId={currentSongId}
              isPlaying={isPlaying}
              onOpenArtist={onOpenArtist}
              onOpenAlbum={onOpenAlbum}
              onOpenCollection={setSelectedCollection}
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