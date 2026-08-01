'use client'

import { useState, useEffect } from "react";
import MusicCards from "./MusicCards";
import FeaturedCards from "./FeaturedCards";
import RecentlyPlayed from "./RecentlyPlayed";
import DailyMixCards from "./DailyMixCards";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel from "./RightPanel";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import CollectionView from "./CollectionView";
import PlaylistView from "./PlaylistView";
import SidebarRail from "./SidebarRail";
import ChatHub from "./chat/ChatHub";
import ChatNotifications from "./chat/ChatNotifications";
import HistoryList from "./HistoryList";
import { Menu, X, Play, Shuffle, Music4 } from "lucide-react";
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

function Equalizer() {
  return (
    <div className="flex gap-0.5 items-end h-3.5">
      <span className="w-0.5 bg-green-400 animate-pulse h-1.5" />
      <span className="w-0.5 bg-green-400 animate-pulse h-3" style={{ animationDelay: "0.2s" }} />
      <span className="w-0.5 bg-green-400 animate-pulse h-2" style={{ animationDelay: "0.4s" }} />
      <span className="w-0.5 bg-green-400 animate-pulse h-3.5" style={{ animationDelay: "0.6s" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section header — shared title + optional "Play all" / "See all" affordances.
 * ------------------------------------------------------------------ */
function SectionHeader({ title, subtitle, onPlayAll, onSeeAll, expanded }) {
  return (
    <div className="flex items-end justify-between gap-4 px-4 mb-3">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-neutral-400 text-xs md:text-sm mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {onPlayAll && (
          <button
            onClick={onPlayAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-3.5 py-1.5 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" /> Play all
          </button>
        )}
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm font-bold text-neutral-400 hover:text-white hover:underline transition-colors"
          >
            {expanded ? "Show less" : "Show all"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero — greeting band with a "spotlight" featured track and a
 * shuffle-play call to action built purely from the current feed.
 * ------------------------------------------------------------------ */
function Hero({ greeting, firstName, spotlight, onPlay, onShuffle, onOpenArtist }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--tt-border)] px-5 py-6 md:px-8 md:py-8"
      style={{
        background:
          "linear-gradient(135deg, var(--tt-hero-start), var(--tt-hero-mid) 48%, var(--tt-hero-end))",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, color-mix(in srgb, var(--tt-accent) 18%, transparent) 55%, color-mix(in srgb, var(--tt-accent-2) 16%, transparent) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--tt-accent), var(--tt-accent-2), transparent)",
        }}
      />
      {/* Soft accent glow orbs — depth without the old diagonal stripes */}
      <div
        className="pointer-events-none absolute top-[-60px] left-[-40px] w-72 h-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tt-accent) 30%, transparent), transparent 70%)",
          filter: "blur(28px)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[-80px] right-[-40px] w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tt-accent-2) 26%, transparent), transparent 70%)",
          filter: "blur(28px)",
        }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/80 mb-2">
            Tune Together
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
            {greeting}{firstName ? <span className="text-indigo-300">, {firstName}</span> : ""}
          </h1>
          <p className="text-neutral-300/80 text-sm md:text-base mt-3 max-w-md">
            Pick a track, jump into chat, and keep the queue moving together.
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
            className="group flex-shrink-0 w-full md:w-72 flex items-center gap-4 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-[var(--tt-border)] p-3 cursor-pointer transition-colors"
          >
            <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-lg shadow-lg">
              <img referrerPolicy="no-referrer"
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

function HomeFeed({ songs, artists, albums, topArtists = [], historySongs = [], recommendations = [], recentHistory = [], mixes = [], onPlay, onQueue, currentSongId, isPlaying, onOpenArtist, onOpenAlbum, onOpenCollection, isLoading }) {
  const { user } = useUser();
  const greeting = getGreeting();
  // In-place "Show all" toggles for rows that can overflow (recently played,
  // top artists) — Spotify-style "See all".
  const [expandedSections, setExpandedSections] = useState({});
  const toggleSection = (key) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));

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
          Search for a song, artist, or mood up top to fill your feed.
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

      {/* Recently played — Spotify "Jump back in" quick-picks */}
      {recentHistory.length > 0 && (
        <section>
          <SectionHeader
            title="Recently played"
            subtitle="Jump back in"
            onSeeAll={() => toggleSection("recent")}
            expanded={!!expandedSections.recent}
          />
          <RecentlyPlayed
            history={recentHistory}
            onPlay={onPlay}
            expanded={!!expandedSections.recent}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
          />
        </section>
      )}

      {/* Made for you — Daily Mixes built from top artists */}
      {mixes.length > 0 && (
        <section>
          <SectionHeader title="Made for you" subtitle="Made from your top artists" />
          <DailyMixCards
            mixes={mixes}
            onPlay={onPlay}
            onOpenCollection={onOpenCollection}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
          />
        </section>
      )}

      {/* Quick picks — themed shortcut tiles built from the feed */}
      <section>
        <SectionHeader title="Quick picks" subtitle="Jump back into the vibe" />
        <FeaturedCards songs={songs} onPlay={onPlay} onQueue={onQueue} onOpenCollection={onOpenCollection} />
      </section>

      {/* Personalized picks from your listening history */}
      {recommendations.length > 0 && (
        <section>
          <SectionHeader
            title="Recommended for you"
            subtitle="Picked from the artists you love, plus a few new finds"
            onPlayAll={() => playAll(recommendations)}
          />
          <MusicCards
            songs={recommendations.slice(0, 12)}
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
          <SectionHeader
            title="Your top artists"
            subtitle="On heavy rotation lately"
            onSeeAll={() => toggleSection("artists")}
            expanded={!!expandedSections.artists}
          />
          <div className="flex overflow-x-auto pb-4 gap-4 md:gap-5 scrollbar-hide px-4">
            {(expandedSections.artists ? topArtists : topArtists.slice(0, 6)).map((artist, idx) => (
              <div
                key={`${artist.id || artist.name}-${idx}`}
                onClick={() => artist.id && onOpenArtist?.(artist.id)}
                className={`flex-shrink-0 w-32 md:w-40 flex flex-col items-center gap-3 group p-3 rounded-xl transition-all duration-300 ${artist.id ? "cursor-pointer hover:bg-white/5" : ""}`}
              >
                <div className="relative">
                  <img referrerPolicy="no-referrer"
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
  songs, artists = [], albums = [], topArtists = [], historySongs = [], recentHistory = [], recommendations = [], mixes = [], isSearchQuery = false,
  onLoadMore, showLoadMore, onPlay, onQueue, currentSongId, currentSong, isPlaying,
  queue, onRemoveFromQueue, onClearQueue, isLoading, error,
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
  const [searchFilter, setSearchFilter] = useState('all');

  // Open a sidebar playlist in-app and close the mobile drawer.
  const openPlaylist = (pl) => {
    onOpenPlaylist?.(pl);
    setShowLeft(false);
  };

  useEffect(() => {
    const openDrawer = () => { setShowRight(true); };
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
            // Join the friend's synced listening session without leaving the page.
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
          onUpdatePlaylist={onOpenPlaylist}
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
            isLoading ? (
              /* skeleton while loading */
              <div className="p-6 flex flex-col gap-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-52 bg-white/5 rounded-2xl animate-pulse" />
                  <div className="flex flex-col gap-3 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                          <div className="h-2.5 bg-white/5 rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-10 pt-2 pb-10">

                {/* ── Filter pills ── */}
                <div className="px-6 flex gap-2 flex-wrap">
                  {['all', 'songs', 'artists', 'albums'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setSearchFilter(filter)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-all duration-200 ${
                        searchFilter === filter
                          ? "bg-white text-black scale-[1.02]"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>

                {/* ── Top Result + Top Tracks (Spotify dual-panel) ── */}
                {(searchFilter === 'all' || searchFilter === 'songs') && (songs.length > 0 || artists.length > 0) && (() => {
                  const topResult = artists[0] || null;
                  const topSong = songs[0] || null;
                  const topItem = topResult || topSong;
                  const isArtistTop = !!topResult;
                  const topImg = isArtistTop
                    ? resolveCover(topResult.picture_xl || topResult.picture_big || topResult.picture_medium, topResult.name)
                    : resolveCover(topSong?.album?.cover_big || topSong?.album?.cover_medium, topSong?.title);
                  const tracksToShow = songs.slice(0, 5);

                  return (
                    <section className="px-6">
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">

                        {/* Left: Top Result card */}
                        {topItem && (
                          <div className="flex flex-col gap-3">
                            <h2 className="text-2xl font-bold text-white">Top result</h2>
                            <div
                              onClick={() => {
                                if (isArtistTop) onOpenArtist(topResult.id);
                                else onPlay(topSong, songs);
                              }}
                              className="group relative bg-[#181818] hover:bg-[#282828] rounded-xl p-6 cursor-pointer transition-all duration-300 h-full min-h-[200px] flex flex-col justify-between overflow-hidden"
                            >
                              {/* bg glow */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-30"
                                  style={{ backgroundColor: 'var(--tt-accent)' }} />
                              </div>

                              <div className="relative flex flex-col gap-5">
                                <img referrerPolicy="no-referrer"
                                  src={topImg}
                                  alt={isArtistTop ? topResult.name : topSong?.title}
                                  onError={coverError(isArtistTop ? topResult.name : topSong?.title)}
                                  className={`w-24 h-24 object-cover shadow-2xl ${isArtistTop ? 'rounded-full' : 'rounded-lg'}`}
                                />
                                <div>
                                  <p className="text-3xl font-extrabold text-white truncate group-hover:text-white transition-colors">
                                    {isArtistTop ? topResult.name : topSong?.title}
                                  </p>
                                  <p className="text-neutral-400 text-sm mt-1 font-medium">
                                    {isArtistTop ? 'Artist' : `Song • ${topSong?.artist?.name || ''}`}
                                  </p>
                                </div>
                              </div>

                              {/* Play button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isArtistTop) onOpenArtist(topResult.id);
                                  else onPlay(topSong, songs);
                                }}
                                className="absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                style={{ backgroundColor: 'var(--tt-accent)' }}
                              >
                                <Play className="w-6 h-6 fill-black text-black ml-0.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Right: Song list */}
                        {tracksToShow.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <h2 className="text-2xl font-bold text-white">Songs</h2>
                            <div className="flex flex-col">
                              {tracksToShow.map((song, idx) => {
                                const isActive = currentSongId === song.id;
                                const playing = isActive && isPlaying;
                                const cover = resolveCover(song.album?.cover_medium || song.album?.cover_small, song.title);
                                return (
                                  <div
                                    key={song.id + idx}
                                    onClick={() => onPlay(song, songs)}
                                    className={`group flex items-center gap-4 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                                      isActive ? 'bg-white/10' : 'hover:bg-white/[0.07]'
                                    }`}
                                  >
                                    {/* Index / equalizer */}
                                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                                      {playing ? (
                                        <Equalizer />
                                      ) : (
                                        <>
                                          <span className={`text-sm font-medium group-hover:hidden ${isActive ? 'text-green-400' : 'text-neutral-400'}`}>
                                            {idx + 1}
                                          </span>
                                          <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                                        </>
                                      )}
                                    </div>

                                    {/* Cover */}
                                    <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                                      {cover && <img referrerPolicy="no-referrer" src={cover} alt={song.title} className="w-full h-full object-cover" />}
                                    </div>

                                    {/* Title + Artist */}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-green-400' : 'text-white'}`}>
                                        {song.title}
                                      </p>
                                      <p className="text-neutral-400 text-xs truncate mt-0.5 hover:text-white transition-colors cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); song.artist?.id && onOpenArtist(song.artist.id); }}>
                                        {song.artist?.name || 'Unknown Artist'}
                                      </p>
                                    </div>

                                    {/* Duration */}
                                    {song.duration && (
                                      <span className="text-neutral-500 text-xs flex-shrink-0 tabular-nums">
                                        {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })()}

                {/* ── Artists ── */}
                {artists.length > 0 && (searchFilter === 'all' || searchFilter === 'artists') && (
                  <section className="px-6">
                    <h2 className="text-2xl font-bold text-white mb-5">Artists</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                      {artists.slice(0, 14).map(artist => (
                        <div
                          key={artist.id}
                          onClick={() => onOpenArtist(artist.id)}
                          className="group flex flex-col items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all duration-200"
                        >
                          <div className="relative w-full">
                            <div className="aspect-square w-full rounded-full overflow-hidden bg-neutral-800 shadow-lg">
                              <img referrerPolicy="no-referrer"
                                src={resolveCover(artist.picture_medium || artist.picture_small, artist.name)}
                                alt={artist.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={coverError(artist.name)}
                              />
                            </div>
                            <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                              style={{ backgroundColor: 'var(--tt-accent)' }}>
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                          <div className="text-center w-full">
                            <p className="text-white text-sm font-semibold truncate">{artist.name}</p>
                            <p className="text-neutral-400 text-xs mt-0.5">Artist</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Albums ── */}
                {albums.length > 0 && (searchFilter === 'all' || searchFilter === 'albums') && (
                  <section className="px-6">
                    <h2 className="text-2xl font-bold text-white mb-5">Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {albums.slice(0, 12).map(album => (
                        <div
                          key={album.id}
                          onClick={() => onOpenAlbum(album.id)}
                          className="group flex flex-col gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all duration-200"
                        >
                          <div className="relative">
                            <div className="aspect-square w-full rounded-lg overflow-hidden bg-neutral-800 shadow-lg">
                              <img referrerPolicy="no-referrer"
                                src={resolveCover(album.cover_medium || album.cover_small, album.title)}
                                alt={album.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={coverError(album.title)}
                              />
                            </div>
                            <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                              style={{ backgroundColor: 'var(--tt-accent)' }}>
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold truncate">{album.title}</p>
                            <p className="text-neutral-400 text-xs truncate mt-0.5">{album.artist?.name || 'Album'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── All Songs (when Songs filter selected) ── */}
                {searchFilter === 'songs' && songs.length > 0 && (
                  <section className="px-6">
                    <h2 className="text-2xl font-bold text-white mb-4">All Songs</h2>
                    <div className="flex flex-col">
                      {songs.map((song, idx) => {
                        const isActive = currentSongId === song.id;
                        const playing = isActive && isPlaying;
                        const cover = resolveCover(song.album?.cover_medium || song.album?.cover_small, song.title);
                        return (
                          <div
                            key={song.id + idx}
                            onClick={() => onPlay(song, songs)}
                            className={`group flex items-center gap-4 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                              isActive ? 'bg-white/10' : 'hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="w-5 flex-shrink-0 flex items-center justify-center">
                              {playing ? (
                                <Equalizer />
                              ) : (
                                <>
                                  <span className={`text-sm font-medium group-hover:hidden ${isActive ? 'text-green-400' : 'text-neutral-500'}`}>
                                    {idx + 1}
                                  </span>
                                  <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                                </>
                              )}
                            </div>
                            <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                              {cover && <img referrerPolicy="no-referrer" src={cover} alt={song.title} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isActive ? 'text-green-400' : 'text-white'}`}>
                                {song.title}
                              </p>
                              <p className="text-neutral-400 text-xs truncate mt-0.5 hover:text-white transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); song.artist?.id && onOpenArtist(song.artist.id); }}>
                                {song.artist?.name || 'Unknown Artist'}
                              </p>
                            </div>
                            {song.duration && (
                              <span className="text-neutral-500 text-xs flex-shrink-0 tabular-nums">
                                {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              </div>
            )
          ) : (
            /* --- HOME FEED VIEW --- */
            <HomeFeed
              songs={songs}
              artists={artists}
              albums={albums}
              topArtists={topArtists}
              historySongs={historySongs}
              recentHistory={recentHistory}
              recommendations={recommendations}
              mixes={mixes}
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
      <ChatNotifications
        onOpenDm={(dmId) => {
          setChatDm({ id: dmId, ts: Date.now() });
          setActiveSidebarView("chat");
          setShowLeft(false);
          setShowRight(false);
        }}
      />

      {/* Mobile / tablet top bar */}
      <div className="flex lg:hidden gap-2 p-2 bg-[#121212] border-b border-[var(--tt-divider)] flex-shrink-0">
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
        {activeSidebarView === 'history' ? (
          <HistoryList history={recentHistory} onPlay={onPlay} />
        ) : (
          <PlaylistSidebar
            onOpenPlaylist={openPlaylist}
            externalView={activeSidebarView} 
            onExternalViewChange={setActiveSidebarView} 
          />
        )}
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
            />
            <div className="flex-1 bg-[#121212] flex flex-col overflow-hidden min-w-0">
              <div className="flex items-center justify-between p-4 border-b border-[var(--tt-divider)]">
                <h3 className="text-white font-bold">{activeSidebarView === 'history' ? 'History' : 'Your Library'}</h3>
                <button onClick={() => setShowLeft(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeSidebarView === 'history' ? (
                  <HistoryList history={recentHistory} onPlay={onPlay} />
                ) : (
                  <PlaylistSidebar
                    onOpenPlaylist={openPlaylist}
                    externalView={activeSidebarView}
                    onExternalViewChange={setActiveSidebarView}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex-1 rounded-xl flex flex-col min-w-0 overflow-hidden h-full"
        style={{
          background:
            "linear-gradient(to bottom, var(--tt-page-start), var(--tt-bg) 44%, var(--tt-bg))",
        }}
      >
        {renderMain()}
      </div>

      {/* Right panel - desktop */}
      <div className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 bg-[#121212] rounded-xl overflow-hidden flex-col h-full">
        <RightPanel
          queue={queue}
          currentSong={currentSong}
          onRemoveFromQueue={onRemoveFromQueue}
          onClearQueue={onClearQueue}
          recentHistory={recentHistory}
          onPlay={onPlay}
        />
      </div>

      {/* Mobile / tablet right drawer */}
      {showRight && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowRight(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs bg-[#121212] shadow-2xl flex flex-col z-50 overflow-hidden pb-[84px] md:pb-[104px] animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-[var(--tt-divider)] flex-shrink-0">
              <h3 className="text-white font-bold">Queue</h3>
              <button onClick={() => setShowRight(false)} className="p-1.5 hover:bg-white/10 rounded-full transition">
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <RightPanel
                queue={queue}
                currentSong={currentSong}
                onRemoveFromQueue={onRemoveFromQueue}
                onClearQueue={onClearQueue}
                recentHistory={recentHistory}
                onPlay={onPlay}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
