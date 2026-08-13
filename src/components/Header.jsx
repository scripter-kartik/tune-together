'use client'

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Search, Home, LayoutGrid, Clock, X, Play, Pause, ChevronRight } from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

function HeaderContent({ externalQuery, externalSetQuery, externalHandleSearch, externalRoomId, externalOnPlay, externalOnOpenArtist }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = externalRoomId || searchParams?.get("room") || null;

  const [internalQuery, setInternalQuery] = useState("");
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = externalSetQuery !== undefined ? externalSetQuery : setInternalQuery;

  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Track currently playing song & state from global events
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const onGlobalState = (e) => {
      const { currentSong: s, isPlaying: p } = e.detail || {};
      if (s !== undefined) setCurrentSong(s);
      if (p !== undefined) setIsPlaying(p);
    };
    window.addEventListener("tt-global-state", onGlobalState);
    window.dispatchEvent(new CustomEvent("tt-request-global-state"));
    return () => window.removeEventListener("tt-global-state", onGlobalState);
  }, []);

  // Spotify-style recent searches, persisted locally.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tt-recent-searches") || "[]");
      if (Array.isArray(stored)) setRecentSearches(stored.slice(0, 8));
    } catch {}
  }, []);

  const saveRecentSearch = (term) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const updated = [t, ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      try { localStorage.setItem("tt-recent-searches", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (term) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => r !== term);
      try { localStorage.setItem("tt-recent-searches", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("tt-recent-searches"); } catch {}
  };

  // Sync internal query with URL if it's acting independently
  useEffect(() => {
    if (externalQuery === undefined) {
      const q = searchParams?.get("q");
      if (q) setInternalQuery(q);
    }
  }, [searchParams, externalQuery]);

  const handleSearch = (overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (q) saveRecentSearch(q);
    if (externalHandleSearch) {
      externalHandleSearch(q);
    } else {
      if (q) {
        router.push(`/?q=${encodeURIComponent(q)}${roomId ? `&room=${roomId}` : ""}`);
      }
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const top = [];
          // First artist as top result
          if (data.artists?.length > 0) top.push({ type: 'Artist', ...data.artists[0] });
          // Then up to 8 songs
          if (data.songs?.length > 0) top.push(...data.songs.slice(0, 8).map(s => ({ type: 'Song', ...s })));
          setSuggestions(top.slice(0, 9));
        }
      } catch (err) {
        console.error("Failed to load suggestions", err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
      setFocused(false);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  // Play or pause a song from suggestions - keeps dropdown open
  const handleSuggestionPlay = (e, song) => {
    e.preventDefault();
    e.stopPropagation();
    const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
    if (isCurrentlyPlaying) {
      // Pause
      window.dispatchEvent(new CustomEvent("tt-player-command", { detail: { action: "pause" } }));
    } else {
      // Play
      if (externalOnPlay) externalOnPlay(song);
    }
  };

  const isThisSongPlaying = (song) =>
    currentSong?.id === song.id && isPlaying;

  const isThisSongCurrent = (song) =>
    currentSong?.id === song.id;

  // Standalone round Browse button, shown beside the search bar on every breakpoint.
  // Scales with the search bar height: small on mobile, larger on tablet/laptop.
  const browseButton = (
    <Link href="/browse" className="flex-shrink-0" aria-label="Browse" title="Browse">
      <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-[#242424] transition-colors hover:bg-[#2a2a2a] rounded-full flex items-center justify-center cursor-pointer">
        <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
    </Link>
  );

  const searchBar = (
    <div className="relative flex-1 min-w-0 max-w-full lg:max-w-[500px] xl:max-w-[560px] 2xl:max-w-[680px]">
      <div className="flex items-center gap-2 sm:gap-3 bg-[#242424] hover:bg-[#2a2a2a] rounded-full px-3 sm:px-4 h-10 sm:h-11 lg:h-12 w-full transition-colors">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          data-search-input
          placeholder="What do you want to play?"
          className="text-white text-sm sm:text-base lg:text-sm font-medium outline-none border-0 bg-transparent flex-1 min-w-0 placeholder-neutral-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-neutral-400 transition-colors hover:text-white text-lg leading-none flex-shrink-0 p-1"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Recent searches — Spotify-style, shown on focus with an empty query */}
      {focused && !query.trim() && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-xl shadow-2xl border border-[var(--tt-border)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <p className="text-white text-sm font-bold">Recent searches</p>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                clearRecentSearches();
              }}
              className="text-neutral-400 transition-colors hover:text-white text-xs font-semibold"
            >
              Clear all
            </button>
          </div>
          {recentSearches.map((term) => (
            <div
              key={term}
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(term);
                setFocused(false);
                setTimeout(() => handleSearch(term), 0);
              }}
              className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-white/10 cursor-pointer group"
            >
              <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <p className="flex-1 min-w-0 text-white text-sm font-medium truncate">{term}</p>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeRecentSearch(term);
                }}
                className="text-neutral-500 transition-colors hover:text-white flex-shrink-0 p-1"
                aria-label={`Remove ${term} from recent searches`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {focused && query.trim() && (suggestions.length > 0 || isFetchingSuggestions) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-[var(--tt-border)] overflow-hidden z-50 flex flex-col max-h-[520px]">

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            {isFetchingSuggestions && suggestions.length === 0 ? (
              <div className="p-3 flex flex-col gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <div className="w-10 h-10 rounded-md bg-white/10 animate-pulse flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${55 + i * 8}%` }} />
                      <div className="h-2.5 bg-white/[0.06] rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Song suggestions - Spotify-style rows */}
                <div className="py-1">
                  {suggestions.map((s, i) => {
                    const isArtist = s.type === 'Artist';
                    const img = isArtist
                      ? resolveCover(s.picture_medium || s.picture_small, s.name)
                      : resolveCover(s.album?.cover_medium || s.album?.cover_small, s.title);
                    const playing = !isArtist && isThisSongPlaying(s);
                    const current = !isArtist && isThisSongCurrent(s);

                    return (
                      <div
                        key={i}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (isArtist) {
                            setFocused(false);
                            setQuery("");
                            if (externalOnOpenArtist) externalOnOpenArtist(s.id);
                            else handleSearch(s.name);
                          }
                          // For songs, clicking the row itself does nothing — use play button
                        }}
                        className={`flex items-center gap-3 px-3 py-2 cursor-default group transition-colors ${
                          current ? "bg-white/[0.06]" : "hover:bg-white/[0.06]"
                        } ${isArtist ? "cursor-pointer" : ""}`}
                      >
                        {/* Thumbnail */}
                        <div className={`relative w-11 h-11 flex-shrink-0 bg-neutral-800 overflow-hidden shadow-md ${isArtist ? 'rounded-full' : 'rounded-md'}`}>
                          {img && <img referrerPolicy="no-referrer" src={img} alt={s.name || s.title} onError={coverError(s.name || s.title)} className="w-full h-full object-cover" />}
                          {/* Play/Pause overlay for songs */}
                          {!isArtist && (
                            <button
                              onClick={(e) => handleSuggestionPlay(e, s)}
                              onMouseDown={(e) => handleSuggestionPlay(e, s)}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {playing ? (
                                <Pause className="w-4 h-4 text-white fill-white" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate transition-colors ${
                            current ? "text-green-400" : "text-white group-hover:text-white"
                          }`}>
                            {s.title || s.name}
                          </p>
                          <p className="text-neutral-500 text-xs truncate mt-0.5">
                            {isArtist ? "Artist" : `Song${s.artist?.name ? ` • ${s.artist.name}` : ''}`}
                          </p>
                        </div>

                        {/* Song: dedicated play button on the right */}
                        {!isArtist && (
                          <button
                            onClick={(e) => handleSuggestionPlay(e, s)}
                            onMouseDown={(e) => handleSuggestionPlay(e, s)}
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              playing
                                ? "bg-green-500 text-black opacity-100"
                                : "bg-white/10 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-colors hover:bg-green-500 hover:text-black active:bg-green-500 active:text-black"
                            }`}
                          >
                            {playing ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        )}
                        {/* Artist: arrow */}
                        {isArtist && (
                          <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pinned footer — "View all results" */}
          {!isFetchingSuggestions && suggestions.length > 0 && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setFocused(false);
                handleSearch(query);
              }}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.06] cursor-pointer border-t border-[var(--tt-border)] flex-shrink-0 group"
            >
              <p className="text-white text-sm font-medium">
                View all results for <span className="font-bold text-green-400">"{query}"</span>
              </p>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-black px-3 sm:px-4 md:px-6 py-2 md:py-3">
      {/* Top row */}
      <div className="relative flex items-center justify-between gap-2 sm:gap-3 md:gap-4">

        {/* Left - Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          {/* Logo - always visible, adapts size */}
          <Link href="/" className="flex items-center min-w-0 hover:opacity-80 transition-opacity" aria-label="Home">
            <span className="font-black text-sm sm:text-base md:text-lg tracking-tight text-white truncate drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
              tune<span className="text-green-500">together</span>
            </span>
          </Link>
        </div>

        {/* Center - Nav + Search (desktop only, lg breakpoint = 1024px+) */}
        <div className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 w-full max-w-[560px] xl:max-w-2xl 2xl:max-w-3xl px-2">
          <Link href="/" className="flex-shrink-0">
            <div className="w-12 h-12 bg-[#242424] transition-colors hover:bg-[#2a2a2a] rounded-full flex items-center justify-center cursor-pointer">
              <Home className="w-5 h-5 text-white" />
            </div>
          </Link>
          {searchBar}
          {browseButton}
        </div>

        {/* Right - Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {mounted && (
            <>
              <SignedOut>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <SignInButton mode="modal">
                    <span className="hidden sm:inline-block text-neutral-300 transition-colors hover:text-white text-xs sm:text-sm font-bold cursor-pointer px-2 py-1">
                      Log in
                    </span>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <span className="inline-block text-black bg-white transition-colors hover:bg-neutral-200 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold cursor-pointer hover:scale-105 transition-transform whitespace-nowrap">
                      Sign up
                    </span>
                  </SignUpButton>
                </div>
              </SignedOut>
              <SignedIn>
                <div className="scale-90 sm:scale-100 origin-right">
                  <UserButton />
                </div>
              </SignedIn>
            </>
          )}
        </div>
      </div>

      {/* Mobile/Tablet search row (shown below 1024px) */}
      <div className="flex lg:hidden items-center gap-2 sm:gap-3 mt-2 sm:mt-2.5">
        {searchBar}
        {browseButton}
      </div>
    </div>
  );
}

export default function Header(props) {
  return (
    <Suspense fallback={<div className="h-14 bg-black"></div>}>
      <HeaderContent
        externalQuery={props.query}
        externalSetQuery={props.setQuery}
        externalHandleSearch={props.handleSearch}
        externalRoomId={props.roomId}
        externalOnPlay={props.onPlay}
        externalOnOpenArtist={props.onOpenArtist}
      />
    </Suspense>
  );
}
