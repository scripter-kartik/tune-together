// src/components/Header.jsx

import Link from "next/link";

export default function Header({ query, setQuery, handleSearch }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mt-3 px-5">
      {/* Logo */}
      <img src="/spotify.png" alt="Logo" className="h-10" />

      {/* Main Navigation Area */}
      <div className="flex flex-wrap justify-center items-center gap-3 flex-1">
        {/* Home Button */}
        <Link href="/">
          <div className="bg-[#1e1e1e] w-12 h-12 rounded-full flex justify-center items-center p-2 hover:bg-[#2a2a2a] transition cursor-pointer">
            <img className="w-7 h-7" src="/home.png" alt="Home" />
          </div>
        </Link>

        {/* Search Bar */}
        <div className="bg-[#1e1e1e] flex items-center rounded-full px-3 py-2 h-12 flex-1 max-w-2xl">
          <img className="w-6 h-6 mr-3" src="/search.png" alt="Search" />
          <input
            type="text"
            placeholder="What do you want to play?"
            className="text-white outline-none border-0 bg-transparent flex-1 min-w-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <img className="w-5 h-7 mx-2" src="/line.png" alt="Divider" />
          <button 
            onClick={handleSearch}
            className="hover:opacity-80 transition"
          >
            <img className="w-7 h-7" src="/browse.png" alt="Browse" />
          </button>
        </div>

        {/* Premium Button */}
        <div className="bg-white rounded-full px-4 h-10 flex justify-center items-center hover:scale-105 transition cursor-pointer">
          <h1 className="font-extrabold text-sm whitespace-nowrap">
            Explore Premium
          </h1>
        </div>

        {/* Install App */}
        <div className="flex justify-between items-center gap-2 hover:opacity-80 transition cursor-pointer">
          <img className="w-5 h-5" src="/download.png" alt="Download" />
          <h1 className="text-white text-sm hidden sm:block">Install App</h1>
        </div>

        {/* User Controls */}
        <div className="flex justify-center items-center gap-4">
          <img
            className="w-5 h-5 cursor-pointer hover:opacity-80 transition"
            src="/notification.png"
            alt="Notifications"
          />
          <img
            className="w-5 h-5 cursor-pointer hover:opacity-80 transition"
            src="/friends.png"
            alt="Friends"
          />
          <div className="w-8 h-8 bg-green-400 rounded-full flex justify-center items-center shadow-lg cursor-pointer hover:bg-green-500 transition">
            <h1 className="font-bold">K</h1>
          </div>
        </div>
      </div>
    </div>
  );
}