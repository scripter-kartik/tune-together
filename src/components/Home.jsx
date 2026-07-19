'use client'

import { useState, useEffect } from "react";
import MusicCards from "./MusicCards";
import FeaturedCards from "./FeaturedCards";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel from "./RightPanel";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import CollectionView from "./CollectionView";
import PlaylistView from "./PlaylistView";
import ReactionOverlay from "./ReactionOverlay";
import SidebarRail from "./SidebarRail";
import ChatHub from "./chat/ChatHub";
import { Menu, X, Play, Shuffle, Music4, Plus, Compass } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night vibes";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

function coverOf(song) {
  return resolveCover(
    song?.album?.cover_medium ||
      song?.album?.cover_big ||
      song?.album?.cover_small,
    song?.title || song?.id
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
                onError={coverError(spotlight.title || spotlight.id)}
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
    // The list itself becomes the playback context (Next/Prev walk it).
    onPlay(list[0], list);
  };

  const shuffleFeed = () => {
    if (!songs.length) return;
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    onPlay(shuffled[0], shuffled);
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
                    src={resolveCover(artist.image, artist.name)}
                    alt={artist.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                    onError={coverError(artist.name)}
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
  onLoadMore, showLoadMore, onPlay, onQueue, currentSongId, currentSong, isPlaying,
  queue, onRemoveFromQueue, onClearQueue, isLoading, error, roomId, socketRef,
  selectedArtistId, onOpenArtist, selectedAlbumId, onOpenAlbum,
  selectedPlaylist, onOpenPlaylist,
}) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [activeSidebarView, setActiveSidebarView] = useState('library');
  // DM to open inside the embedded chat view. { id, ts } — ts so re-clicking
  // the same friend re-triggers the effect in ChatHub.
  const [chatDm, setChatDm] = useState(null);

  // Open a sidebar playlist in-app and close the mobile drawer.
  const openPlaylist = (pl) => {
    onOpenPlaylist?.(pl);
    setShowLeft(false);
  };

  useEffect(() => {
    const openDrawer = () => setShowRight(true);
    // Any component (e.g. the friends panel) can open a chat in-place without
    // navigating away — the player keeps running.
    const openChat = (e) => {
      setChatDm(e.detail?.dm ? { id: e.detail.dm, ts: Date.now() } : null);
      setActiveSidebarView('chat');
      setShowLeft(false);
      setShowRight(false);
    };
    window.addEventListener("tt-open-queue", openDrawer);
    window.addEventListener("tt-open-chat", openChat);
    return () => {
      window.removeEventListener("tt-open-queue", openDrawer);
      window.removeEventListener("tt-open-chat", openChat);
    };
  }, []);

  const renderMain = () => {
    // Chat takes over the main area regardless of any open sub-view — the
    // player footer (owned by the page shell) keeps running underneath.
    if (activeSidebarView === 'chat') {
      return (
        <ChatHub
          embedded
          initialDm={chatDm}
          nowPlaying={currentSong}
          onExit={() => setActiveSidebarView('library')}
          onJoinSession={(newRoomId) => {
            // Join the friend's listening room without leaving the page.
            window.dispatchEvent(new CustomEvent("tt-join-room", { detail: newRoomId }));
            setActiveSidebarView('library');
          }}
        />
      );
    }

    if (selectedPlaylist) {
      return (
        <PlaylistView
          playlist={selectedPlaylist}
          onClose={() => openPlaylist(null)}
          onPlay={onPlay}
          onQueue={onQueue}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onOpenArtist={onOpenArtist}
        />
      );
    }
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
          onOpenArtist={onOpenArtist}
        />
      );
    }

    if (activeSidebarView === 'explore') {
      return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gradient-to-b from-[#1a1a2e] to-[#121212]">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Explore Rooms</h1>
          <p className="text-neutral-400 mb-8">Discover live listening sessions happening right now.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div 
              onClick={() => { window.dispatchEvent(new CustomEvent("tt-join-room", { detail: crypto.randomUUID() })); }}
              className="group h-40 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-green-500/50"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-white font-bold">Start a New Room</p>
            </div>
            {/* Real public rooms appear on the rail, but this serves as a placeholder grid */}
            <div className="h-40 bg-gradient-to-br from-indigo-900/40 to-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-6 text-center">
               <Compass className="w-8 h-8 text-indigo-400 mb-2 opacity-50" />
               <p className="text-neutral-300 text-sm font-semibold">Active public rooms appear on the left rail automatically!</p>
            </div>
          </div>
        </div>
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
                                src={resolveCover(artist.picture_medium, artist.name)}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                                onError={coverError(artist.name)}
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
                                src={resolveCover(album.cover_medium, album.title)}
                                className="w-full aspect-square rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300 object-cover"
                                onError={coverError(album.title)}
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

          {/* Load more - inline at the end of the scroll content, so it only
              appears once the user scrolls to the bottom of the feed */}
          {showLoadMore && !isSearchQuery && (
            <div className="p-4 pb-6 flex justify-center">
              <button
                onClick={onLoadMore}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-2 rounded-full transition text-sm"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-0 lg:gap-2 p-0 lg:p-2 bg-black overflow-hidden">

      {/* Mobile / tablet top bar */}
      <div className="flex lg:hidden gap-2 p-2 bg-[#121212] border-b border-neutral-800 flex-shrink-0">
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

      {/* Left rail - desktop */}
      <div className="hidden lg:flex flex-shrink-0 h-full rounded-l-xl overflow-hidden">
        <SidebarRail activeView={activeSidebarView} onTabChange={setActiveSidebarView} />
      </div>

      {/* Left sidebar - desktop */}
      <div className="hidden lg:flex lg:w-64 xl:w-72 flex-shrink-0 bg-[#121212] rounded-r-xl overflow-hidden flex-col h-full">
        <PlaylistSidebar
          onOpenPlaylist={openPlaylist}
          externalView={activeSidebarView} 
          onExternalViewChange={setActiveSidebarView} 
        />
      </div>

      {/* Mobile / tablet left drawer: Discord-style rail + library panel */}
      {showLeft && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLeft(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[92%] max-w-sm shadow-2xl flex z-50 overflow-hidden pb-[84px] md:pb-[104px] animate-slide-left">
            {/* Icon rail (same one as desktop) */}
            <SidebarRail
              activeView={activeSidebarView}
              onTabChange={setActiveSidebarView}
              onNavigate={() => setShowLeft(false)}
              onOpenFriends={() => {
                window.dispatchEvent(new CustomEvent("tt-open-dms"));
                setShowRight(true);
              }}
            />
            <div className="flex-1 bg-[#121212] flex flex-col overflow-hidden min-w-0">
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h3 className="text-white font-bold">Your Library</h3>
                <button onClick={() => setShowLeft(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PlaylistSidebar
                  onOpenPlaylist={openPlaylist}
                  externalView={activeSidebarView}
                  onExternalViewChange={setActiveSidebarView}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 bg-gradient-to-b from-[#1a1a2e] via-[#121212] to-[#121212] rounded-xl flex flex-col min-w-0 overflow-hidden h-full">
        {renderMain()}

        {roomId && (
          <ReactionOverlay roomId={roomId} socketRef={socketRef} />
        )}
      </div>

      {/* Right panel - desktop */}
      <div className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 bg-[#121212] rounded-xl overflow-hidden flex-col h-full">
        <RightPanel
          queue={queue}
          onRemoveFromQueue={onRemoveFromQueue}
          onClearQueue={onClearQueue}
        />
      </div>

      {/* Mobile / tablet right drawer */}
      {showRight && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowRight(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs bg-[#121212] shadow-2xl flex flex-col z-50 overflow-hidden pb-[84px] md:pb-[104px] animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h3 className="text-white font-bold">Queue & Room</h3>
              <button onClick={() => setShowRight(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RightPanel
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