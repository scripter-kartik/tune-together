'use client'

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Header({ query, setQuery, handleSearch }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-3 md:px-5 px-3">

      {/* ✅ Desktop Title */}
      <div className="md:flex hidden items-center gap-1">
        <img src="/icon2.png" alt="Logo" className="md:w-10 md:h-10" />
        <h1 className="font-bold text-green-400">tune-together</h1>
      </div>

      {/* ✅ Desktop Full Section */}
      <div className="md:flex hidden items-center justify-between w-[calc(100vw-240px)]">

        <div className="flex flex-wrap justify-center items-center gap-3 flex-1">

          {/* Home */}
          <Link href="/">
            <div className="bg-[#1e1e1e] w-10 h-10 rounded-full flex justify-center items-center p-2 hover:bg-[#2a2a2a] transition cursor-pointer">
              <img className="w-5 h-5" src="/home.png" alt="Home" />
            </div>
          </Link>

          {/* Search + Browse */}
          <div className="bg-[#1e1e1e] flex items-center rounded-full px-3 py-2 h-10 flex-1 max-w-2xl mr-2">
            <img className="w-5 h-5 mr-3" src="/search.png" alt="Search" />

            <input
              type="text"
              placeholder="What do you want to play?"
              className="text-white outline-none border-0 bg-transparent flex-1 min-w-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <img className="w-5 h-7 mx-2" src="/line.png" alt="Divider" />

            <Link href="/browse">
              <button className="hover:opacity-80 transition flex items-center">
                <img className="w-5 h-5 mr-1" src="/browse.png" alt="Browse" />
              </button>
            </Link>
          </div>
        </div>

        {/* Auth */}
        <div className="flex justify-center items-center gap-4">
          <SignedOut>
            <div className="flex justify-center items-center gap-1">
              <SignInButton mode="modal">
                <div className="px-5 py-2 text-gray-300 text-[13px] shadow-lg cursor-pointer hover:text-white">
                  <h1 className="font-bold">Login</h1>
                </div>
              </SignInButton>

              <SignUpButton mode="modal">
                <div className="text-black px-5 py-3 bg-green-400 rounded-full shadow-lg cursor-pointer hover:bg-green-500 hover:scale-110 text-sm transition">
                  <h1 className="font-bold">Signup</h1>
                </div>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      {/* ✅ MOBILE */}
      <div className="flex flex-col w-full h-full md:hidden">

        {/* Row 1 → Logo + Auth */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <img src="/icon2.png" alt="Logo" className="w-6 h-6" />
            <h1 className="font-bold text-green-400">tune-together</h1>
          </div>

          <div>
            <SignedOut>
              <div className="flex items-center gap-1">
                <SignInButton mode="modal">
                  <div className="px-4 py-1 text-gray-300 text-[13px] cursor-pointer hover:text-white transition">
                    <h1 className="font-bold">Login</h1>
                  </div>
                </SignInButton>

                <SignUpButton mode="modal">
                  <div className="text-black px-4 py-2 bg-green-400 rounded-full cursor-pointer hover:bg-green-500 hover:scale-105 text-sm transition">
                    <h1 className="font-bold">Signup</h1>
                  </div>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        {/* Row 2 → Home + Search + Browse */}
        <div className="flex items-center gap-2 mt-3 w-full">

          {/* Home */}
          <Link href="/">
            <div className="bg-[#1e1e1e] w-10 h-10 rounded-full flex justify-center items-center p-2 hover:bg-[#2a2a2a] transition cursor-pointer">
              <img className="w-5 h-5" src="/home.png" alt="Home" />
            </div>
          </Link>

          {/* Search */}
          <div className="bg-[#1e1e1e] flex items-center rounded-full px-3 py-2 h-10 flex-1">
            <img className="w-5 h-5 mr-3" src="/search.png" alt="Search" />

            <input
              type="text"
              placeholder="What do you want to play?"
              className="text-white outline-none border-0 bg-transparent flex-1 min-w-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <img className="w-5 h-7 mx-2" src="/line.png" alt="Divider" />

            <Link href="/browse">
              <button className="hover:opacity-80 transition flex items-center">
                <img className="w-5 h-5 mr-1" src="/browse.png" alt="Browse" />
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
