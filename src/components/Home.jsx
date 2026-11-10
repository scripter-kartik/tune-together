'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import HomeFeed from "./home/HomeFeed";
import BrowseView from "./BrowseView";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel, { RightRail, ResizeHandle, RIGHT_DEFAULT_W } from "./RightPanel";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import CollectionView from "./CollectionView";
import PlaylistView from "./PlaylistView";
import SidebarRail from "./SidebarRail";
import Footer from "./Footer";
import ChatHub from "./chat/ChatHub";
import ChatNotifications from "./chat/ChatNotifications";
import HistoryList from "./HistoryList";
import { X, Play, Pause } from "lucide-react";
import { resolveCover, coverError } from "../lib/coverPlaceholder";

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


const XL_QUERY = "(min-width: 1280px)";
const RIGHT_OPEN_KEY = "tt-right-panel-open";
const RIGHT_WIDTH_KEY = "tt-right-panel-width";

function useIsXL() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(XL_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(XL_QUERY).matches,
    () => false
  );
}

// Keeps an overlay mounted long enough to play its exit transition.
function usePresence(open, ms = 320) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, visible };
}

export default function Home({
  songs, allSongs, artists = [], albums = [], topArtists = [], historySongs = [], recentHistory = [], recommendations = [], mixes = [], isSearchQuery = false,
  onLoadMore, showLoadMore, onPlay, onQueue, currentSongId, currentSong, isPlaying,
  queue, onRemoveFromQueue, onClearQueue, isLoading, error,
  selectedArtistId, onOpenArtist, selectedAlbumId, onOpenAlbum,
  selectedPlaylist, onOpenPlaylist,
}) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [rightTab, setRightTab] = useState("queue");
  const [rightDocked, setRightDocked] = useState(true);
  const [sheetDrag, setSheetDrag] = useState(0);
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT_W);
  const dockedRef = useRef(null);
  const drawerRef = useRef(null);
  const isXL = useIsXL();
  const rightDrawer = usePresence(showRight && !isXL);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showBrowse, setShowBrowse] = useState(false);
  const [activeSidebarView, setActiveSidebarView] = useState('library');
  
  
  const [chatDm, setChatDm] = useState(null);
  const [searchFilter, setSearchFilter] = useState('all');

  
  const openPlaylist = (pl) => {
    setShowBrowse(false);
    onOpenPlaylist?.(pl);
    setShowLeft(false);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem(RIGHT_OPEN_KEY) === "0") setRightDocked(false);
      const w = Number(localStorage.getItem(RIGHT_WIDTH_KEY));
      if (Number.isFinite(w) && w > 0) setRightWidth(w);
    } catch {}
  }, []);

  const saveRightWidth = (w) => {
    setRightWidth(w);
    try { localStorage.setItem(RIGHT_WIDTH_KEY, String(w)); } catch {}
  };

  const setDocked = (open) => {
    setRightDocked(open);
    try { localStorage.setItem(RIGHT_OPEN_KEY, open ? "1" : "0"); } catch {}
  };

  useEffect(() => {
    if (isXL) setShowRight(false);
  }, [isXL]);

  // Header/sidebar Home: leave whatever is open (mix, chat, history, search
  // filter, mobile drawers) and land at the top of the home feed.
  useEffect(() => {
    const goHome = () => {
      setShowBrowse(false);
      setSelectedCollection(null);
      setActiveSidebarView("library");
      setChatDm(null);
      setSearchFilter("all");
      setShowLeft(false);
      setShowRight(false);
      requestAnimationFrame(() => {
        document.querySelector(".tt-main .overflow-y-auto")?.scrollTo({ top: 0 });
      });
    };
    window.addEventListener("tt-go-home", goHome);
    return () => window.removeEventListener("tt-go-home", goHome);
  }, []);

  useEffect(() => {
    const openLibrary = () => setShowLeft(true);
    window.addEventListener("tt-open-library", openLibrary);
    return () => window.removeEventListener("tt-open-library", openLibrary);
  }, []);

  // Browse opens inside the main panel (header Browse button, mobile Search
  // tab, or a redirect from the old /browse page).
  useEffect(() => {
    const openBrowse = () => {
      setShowBrowse(true);
      setSelectedCollection(null);
      setActiveSidebarView("library");
      setShowLeft(false);
      requestAnimationFrame(() => document.querySelector(".tt-main .overflow-y-auto")?.scrollTo({ top: 0 }));
    };
    const closeBrowse = () => setShowBrowse(false);
    try {
      if (sessionStorage.getItem("tt-open-browse") === "1") {
        sessionStorage.removeItem("tt-open-browse");
        openBrowse();
      }
    } catch {}
    window.addEventListener("tt-open-browse", openBrowse);
    window.addEventListener("tt-search", closeBrowse);
    return () => {
      window.removeEventListener("tt-open-browse", openBrowse);
      window.removeEventListener("tt-search", closeBrowse);
    };
  }, []);

  useEffect(() => {
    if (!showRight) return;
    const onKey = (e) => { if (e.key === "Escape") setShowRight(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showRight]);

  // Open the right sidebar on a tab. With `toggle`, a second request for the
  // tab that is already showing closes it (like Spotify's queue button).
  const openRight = (tab, { toggle = false } = {}) => {
    const wide = window.matchMedia(XL_QUERY).matches;
    const isOpen = wide ? rightDocked : showRight;
    if (toggle && isOpen && rightTab === tab) {
      wide ? setDocked(false) : setShowRight(false);
      return;
    }
    setRightTab(tab);
    wide ? setDocked(true) : setShowRight(true);
  };

  useEffect(() => {
    const onOpenQueue = (e) => openRight("queue", { toggle: !!e.detail?.toggle });
    window.addEventListener("tt-open-queue", onOpenQueue);
    return () => window.removeEventListener("tt-open-queue", onOpenQueue);
  });

  useEffect(() => {
    
    
    const openChat = (e) => {
      setChatDm(e.detail?.dm ? { id: e.detail.dm, ts: Date.now() } : null);
      setActiveSidebarView('chat');
      setShowLeft(false);
      setShowRight(false);
    };
    window.addEventListener("tt-open-chat", openChat);
    return () => {
      window.removeEventListener("tt-open-chat", openChat);
    };
  }, []);

  const renderMain = () => {
    
    
    if (activeSidebarView === 'chat') {
      return (
        <ChatHub
          embedded
          initialDm={chatDm}
          nowPlaying={currentSong}
          onExit={() => setActiveSidebarView('library')}
          onJoinSession={(newRoomId) => {
            
            window.dispatchEvent(new CustomEvent("tt-join-room", { detail: newRoomId }));
            setActiveSidebarView('library');
          }}
        />
      );
    }

    if (showBrowse) {
      return (
        <div className="flex-1 overflow-y-auto scrollbar">
          <BrowseView />
          <Footer />
        </div>
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
                        isLoading ? (
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

                {}
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

                {}
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

                        {}
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
                              {}
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

                              {}
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

                        {}
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
                                    onClick={() => {
                                      if (isActive && isPlaying) {
                                        window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "pause" } }));
                                      } else if (isActive) {
                                        window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "play" } }));
                                      } else {
                                        onPlay(song, songs);
                                      }
                                    }}
                                    className={`group flex items-center gap-4 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                                      isActive ? 'bg-white/10' : 'hover:bg-white/[0.07]'
                                    }`}
                                  >
                                    {}
                                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                                      {playing ? (
                                        <>
                                          <span className="group-hover:hidden"><Equalizer /></span>
                                          <Pause className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                                        </>
                                      ) : (
                                        <>
                                          <span className={`text-sm font-medium group-hover:hidden ${isActive ? 'text-green-400' : 'text-neutral-400'}`}>
                                            {idx + 1}
                                          </span>
                                          <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                                        </>
                                      )}
                                    </div>

                                    {}
                                    <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                                      {cover && <img referrerPolicy="no-referrer" src={cover} alt={song.title} className="w-full h-full object-cover" />}
                                    </div>

                                    {}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-green-400' : 'text-white'}`}>
                                        {song.title}
                                      </p>
                                      <p className="text-neutral-400 text-xs truncate mt-0.5 hover:text-white transition-colors cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); song.artist?.id && onOpenArtist(song.artist.id); }}>
                                        {song.artist?.name || 'Unknown Artist'}
                                      </p>
                                    </div>

                                    {}
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

                {}
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

                {}
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

                {}
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
                            onClick={() => {
                              if (isActive && isPlaying) {
                                window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "pause" } }));
                              } else if (isActive) {
                                window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "play" } }));
                              } else {
                                onPlay(song, songs);
                              }
                            }}
                            className={`group flex items-center gap-4 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                              isActive ? 'bg-white/10' : 'hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="w-5 flex-shrink-0 flex items-center justify-center">
                              {playing ? (
                                <>
                                  <span className="group-hover:hidden"><Equalizer /></span>
                                  <Pause className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                                </>
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
            <HomeFeed
              songs={allSongs || songs}
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

          {}
          <Footer />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-0 md:gap-2 p-0 md:p-2 bg-black overflow-hidden">
      <ChatNotifications
        onOpenDm={(dmId) => {
          setChatDm({ id: dmId, ts: Date.now() });
          setActiveSidebarView("chat");
          setShowLeft(false);
          setShowRight(false);
        }}
      />

      {}

      {}
      <div className="hidden md:flex flex-shrink-0 h-full rounded-xl lg:rounded-r-none overflow-hidden">
        <SidebarRail activeView={activeSidebarView} onTabChange={setActiveSidebarView} />
      </div>

      {}
      <div className="hidden lg:flex lg:w-64 xl:w-72 flex-shrink-0 bg-[#121212] rounded-r-xl overflow-hidden flex-col h-full">
        {activeSidebarView === 'history' ? (
          <HistoryList history={recentHistory} onPlay={onPlay} />
        ) : (
          <PlaylistSidebar
            onOpenPlaylist={openPlaylist}
            onOpenCollection={(c) => { setShowBrowse(false); onOpenPlaylist?.(null); setSelectedCollection(c); setShowLeft(false); }}
            onOpenArtist={(id) => { setShowBrowse(false); setSelectedCollection(null); onOpenPlaylist?.(null); onOpenAlbum?.(null); onOpenArtist?.(id); setShowLeft(false); }}
            externalView={activeSidebarView}
            onExternalViewChange={setActiveSidebarView}
          />
        )}
      </div>

      {}
      {showLeft && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowLeft(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm shadow-2xl flex z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <SidebarRail
              inDrawer
              activeView={activeSidebarView}
              onTabChange={setActiveSidebarView}
              onNavigate={() => setShowLeft(false)}
            />
            <div className="flex-1 bg-[#121212] flex flex-col overflow-hidden min-w-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tt-divider)] flex-shrink-0">
                <h3 className="text-white font-bold text-sm sm:text-base">{activeSidebarView === 'history' ? 'History' : 'Your Library'}</h3>
                <button onClick={() => setShowLeft(false)} className="p-1.5 hover:bg-white/10 rounded-full transition touch-manipulation">
                  <X size={18} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeSidebarView === 'history' ? (
                  <HistoryList history={recentHistory} onPlay={onPlay} />
                ) : (
                  <PlaylistSidebar
                    onOpenPlaylist={openPlaylist}
                    onOpenCollection={(c) => { setShowBrowse(false); onOpenPlaylist?.(null); setSelectedCollection(c); setShowLeft(false); }}
                    onOpenArtist={(id) => { setShowBrowse(false); setSelectedCollection(null); onOpenPlaylist?.(null); onOpenAlbum?.(null); onOpenArtist?.(id); setShowLeft(false); }}
                    externalView={activeSidebarView}
                    onExternalViewChange={setActiveSidebarView}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      <div
        className="tt-main flex-1 rounded-xl flex flex-col min-w-0 overflow-hidden h-full"
        style={{
          background:
            "linear-gradient(to bottom, var(--tt-page-start), var(--tt-bg) 44%, var(--tt-bg))",
        }}
      >
        {renderMain()}
      </div>

      {/* Right sidebar — docked column (xl+), expanded */}
      {isXL && rightDocked && (
        <aside
          ref={dockedRef}
          className="hidden xl:flex relative w-[var(--tt-right-w)] min-w-[280px] max-w-[40vw] flex-shrink-0 flex-col h-full transition-opacity"
          style={{ "--tt-right-w": `${rightWidth}px` }}
        >
          <ResizeHandle
            targetRef={dockedRef}
            width={rightWidth}
            getMax={() => Math.min(600, window.innerWidth * 0.4)}
            onResize={saveRightWidth}
            onCollapse={() => setDocked(false)}
            onReset={() => saveRightWidth(RIGHT_DEFAULT_W)}
            className="flex -left-[9px]"
          />
          <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden">
          <RightPanel
            queue={queue}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onRemoveFromQueue={onRemoveFromQueue}
            onClearQueue={onClearQueue}
            activeTab={rightTab}
            onTabChange={setRightTab}
            onClose={() => setDocked(false)}
            variant="docked"
          />
          </div>
        </aside>
      )}

      {/* Right sidebar — collapsed icon rail (lg+, or xl when collapsed) */}
      <div className={`hidden md:flex flex-shrink-0 h-full ${rightDocked ? "xl:hidden" : ""}`}>
        <RightRail
          activeTab={showRight ? rightTab : null}
          queueCount={queue?.length || 0}
          onSelect={(tab) => openRight(tab, { toggle: true })}
          onExpand={() => openRight(rightTab)}
        />
      </div>

      {/* Right sidebar — overlay below xl: bottom sheet on phones, side drawer on tablets/laptops */}
      {rightDrawer.mounted && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Queue and activity">
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${rightDrawer.visible ? "opacity-100" : "opacity-0"}`}
            onClick={() => setShowRight(false)}
          />
          <div
            ref={drawerRef}
            className={`absolute inset-x-0 bottom-0 top-[max(env(safe-area-inset-top),2.5rem)] rounded-t-2xl
              sm:inset-x-auto sm:top-0 sm:right-0 sm:w-[var(--tt-right-w)] sm:min-w-[280px] sm:max-w-[88vw] sm:rounded-t-none sm:rounded-l-2xl
              lg:top-2 lg:bottom-2 lg:right-2 lg:rounded-2xl
              overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-white/[0.06]
              ${sheetDrag ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"}
              ${rightDrawer.visible
                ? "translate-y-0 sm:translate-x-0"
                : "translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+1rem)]"}`}
            style={{
              "--tt-right-w": `${rightWidth}px`,
              ...(sheetDrag ? { transform: `translateY(${sheetDrag}px)` } : null),
            }}
          >
            <ResizeHandle
              targetRef={drawerRef}
              width={rightWidth}
              getMax={() => window.innerWidth * 0.88}
              onResize={saveRightWidth}
              onReset={() => saveRightWidth(RIGHT_DEFAULT_W)}
              className="hidden sm:flex left-0"
            />
            <RightPanel
              queue={queue}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onRemoveFromQueue={onRemoveFromQueue}
              onClearQueue={onClearQueue}
              activeTab={rightTab}
              onTabChange={setRightTab}
              onClose={() => setShowRight(false)}
              onDragOffset={setSheetDrag}
              variant="drawer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
