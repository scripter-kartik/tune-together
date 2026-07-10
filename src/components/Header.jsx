'use client'

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import InviteButton from "./InviteButton";

export default function Header({ query, setQuery, handleSearch, roomId }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 md:px-5 px-3 py-2">

      <div className="md:flex hidden items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer">
        <img src="/icon2.png" alt="Logo" className="md:w-8 md:h-8" />
        <h1 className="font-black text-xl tracking-tight text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
          tune<span className="text-green-500">together</span>
        </h1>
      </div>

      <div className="md:flex hidden items-center justify-between w-[calc(100vw-240px)]">

        <div className="flex flex-wrap justify-center items-center gap-3 flex-1">

          <Link href="/">
            <div className="bg-[#1e1e1e] w-12 h-12 rounded-full flex justify-center items-center p-2 hover:bg-[#2a2a2a] hover:scale-105 transition-all cursor-pointer shadow-lg">
              <img className="w-5 h-5 opacity-80 hover:opacity-100" src="/home.png" alt="Home" />
            </div>
          </Link>

          <div className="bg-[#242424] hover:bg-[#2a2a2a] focus-within:bg-[#2a2a2a] focus-within:ring-1 focus-within:ring-white/20 transition-all flex items-center rounded-full px-4 py-2 h-12 flex-1 max-w-2xl mr-2 shadow-lg">
            <img className="w-5 h-5 mr-3 opacity-60" src="/search.png" alt="Search" />

            <input
              type="text"
              placeholder="What do you want to play?"
              className="text-white text-sm font-medium outline-none border-0 bg-transparent flex-1 min-w-0 placeholder-neutral-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="w-[1px] h-6 bg-neutral-700 mx-3"></div>

            <Link href="/browse">
              <button className="text-neutral-400 hover:text-white transition flex items-center font-bold text-sm tracking-wide">
                <img className="w-4 h-4 mr-1.5 opacity-80" src="/browse.png" alt="Browse" />
                Browse
              </button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4">
          <InviteButton roomId={roomId} />
          <SignedOut>
            <div className="flex justify-center items-center gap-1">
              <SignInButton mode="modal">
                <span className="inline-block px-5 py-2 text-gray-300 text-[13px] shadow-lg cursor-pointer hover:text-white font-bold">
                  Login
                </span>
              </SignInButton>

              <SignUpButton mode="modal">
                <span className="inline-block text-black px-5 py-3 bg-green-400 rounded-full shadow-lg cursor-pointer hover:bg-green-500 hover:scale-110 text-sm transition font-bold">
                  Signup
                </span>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      <div className="flex flex-col w-full h-full md:hidden">

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <img src="/icon2.png" alt="Logo" className="w-6 h-6" />
            <h1 className="font-bold text-green-400">tune-together</h1>
          </div>

          <div className="flex items-center gap-2">
            <InviteButton roomId={roomId} />
            <SignedOut>
              <div className="flex items-center gap-1">
                <SignInButton mode="modal">
                  <span className="inline-block px-4 py-1 text-gray-300 text-[13px] cursor-pointer hover:text-white transition font-bold">
                    Login
                  </span>
                </SignInButton>

                <SignUpButton mode="modal">
                  <span className="inline-block text-black px-4 py-2 bg-green-400 rounded-full cursor-pointer hover:bg-green-500 hover:scale-105 text-sm transition font-bold">
                    Signup
                  </span>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 w-full">

          <Link href="/">
            <div className="bg-[#1e1e1e] w-10 h-10 rounded-full flex justify-center items-center p-2 hover:bg-[#2a2a2a] transition cursor-pointer">
              <img className="w-5 h-5" src="/home.png" alt="Home" />
            </div>
          </Link>

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
