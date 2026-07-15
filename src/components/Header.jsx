'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import InviteButton from "./InviteButton";
import FriendsHub from "./FriendsHub";
import { Search, Home, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";

export default function Header({ query, setQuery, handleSearch, roomId }) {
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

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
          if (data.artists?.length > 0) top.push({ type: 'Artist', ...data.artists[0] });
          if (data.songs?.length > 0) top.push(...data.songs.slice(0, 4).map(s => ({ type: 'Song', ...s })));
          setSuggestions(top.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to load suggestions", err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const searchBar = (
    <div className="relative flex-1 min-w-0 max-w-[500px]">
      <div className={`flex items-center gap-3 bg-[#242424] rounded-full px-4 h-11 md:h-12 w-full transition-all duration-200 ${focused ? 'ring-1 ring-white/30 bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]'}`}>
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="What do you want to play?"
          className="text-white text-base md:text-sm font-medium outline-none border-0 bg-transparent flex-1 min-w-0 placeholder-neutral-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-neutral-400 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <div className="w-px h-5 bg-neutral-600 flex-shrink-0" />
        <Link href="/browse" className="flex-shrink-0" aria-label="Browse">
          <LayoutGrid className="w-4 h-4 text-neutral-400 hover:text-white transition-colors" />
        </Link>
      </div>

      {focused && query.trim() && (suggestions.length > 0 || isFetchingSuggestions) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-md shadow-2xl border border-neutral-700 overflow-hidden z-50">
          {isFetchingSuggestions && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">Loading...</div>
          ) : (
            suggestions.map((s, i) => (
              <div 
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const suggestionText = s.title || s.name;
                  setQuery(suggestionText);
                  setFocused(false);
                  setTimeout(() => {
                    handleSearch();
                  }, 0);
                }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 cursor-pointer"
              >
                <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.title || s.name}</p>
                  <p className="text-neutral-400 text-xs truncate">
                    {s.type} {s.artist?.name ? `• ${s.artist.name}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-black px-4 md:px-6 py-2.5 md:py-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3 md:gap-4">

        {/* Left - Logo */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          {/* Logo - mobile only */}
          <Link href="/" className="flex md:hidden items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity" aria-label="Home">
            <img src="/icon2.png" alt="Logo" className="w-7 h-7 flex-shrink-0" />
            <span className="font-black text-base text-white truncate">tune<span className="text-green-500">together</span></span>
          </Link>

          {/* Logo - desktop */}
          <Link href="/" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/icon2.png" alt="Logo" className="w-8 h-8" />
            <span className="font-black text-lg tracking-tight text-white drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
              tune<span className="text-green-500">together</span>
            </span>
          </Link>
        </div>

        {/* Center - Nav + Search (desktop / tablet only) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-3xl">
          <Link href="/" className="flex-shrink-0">
            <div className="w-12 h-12 bg-[#242424] hover:bg-[#2a2a2a] rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <Home className="w-5 h-5 text-white" />
            </div>
          </Link>
          {searchBar}
        </div>

        {/* Right - Auth + Invite */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="hidden md:block">
            <InviteButton roomId={roomId} />
          </div>

          {mounted && (
            <>
              <SignedOut>
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <span className="hidden md:inline-block text-neutral-300 hover:text-white text-sm font-bold cursor-pointer transition-colors px-2 py-1">
                      Log in
                    </span>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <span className="inline-block text-black bg-white hover:bg-neutral-200 px-4 md:px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-all hover:scale-105 whitespace-nowrap">
                      Sign up
                    </span>
                  </SignUpButton>
                </div>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center gap-2 md:gap-3">
                  <FriendsHub roomId={roomId} />
                  <UserButton />
                </div>
              </SignedIn>
            </>
          )}
        </div>
      </div>

      {/* Mobile-only search row (full width, no cramming) */}
      <div className="flex md:hidden mt-2.5">
        {searchBar}
      </div>
    </div>
  );
}
