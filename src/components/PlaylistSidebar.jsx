"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function PlaylistSidebar({ onOpenChat }) {
  const [showChatList, setShowChatList] = useState(false);

  const playlists = [
    {
      id: 1,
      name: "Old is <3",
      type: "Album",
      artist: "Ram :)",
      image: "/playlist1.png",
      gradient: "from-purple-600 to-blue-600",
    },
    {
      id: 2,
      name: "Arijit Singh All time hits",
      type: "Album",
      artist: "Arijit Singh",
      image: "/playlist2.png",
      gradient: "from-red-600 to-orange-600",
    },
    {
      id: 3,
      name: "Best of Shreya Ghoshal",
      type: "Album",
      artist: "Shreya Ghoshal",
      image: "/playlist3.png",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      id: 4,
      name: "Highlights of honey singh",
      type: "Album",
      artist: "Yo yo honey singh",
      image: "/playlist4.png",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      id: 5,
      name: "Golden Songs of Kishore Kumar",
      type: "Album",
      artist: "Kishore Kumar",
      image: "/playlist5.png",
      gradient: "from-teal-500 to-green-600",
    },
    {
      id: 6,
      name: "Madness of Badshah",
      type: "Album",
      artist: "Badshah",
      image: "/playlist6.png",
      gradient: "from-indigo-600 to-purple-600",
    },
    {
      id: 7,
      name: "Charlie Puth Hits of 2024",
      type: "Album",
      artist: "Charlie Puth",
      image: "/playlist7.png",
      gradient: "from-pink-500 to-rose-600",
    },
  ];

  // Mock chat users - replace with real data from your API
  const chatUsers = [
    { id: 1, clerkId: "user_1", name: "Alex Morgan", imageUrl: "/api/placeholder/40/40", isOnline: true },
    { id: 2, clerkId: "user_2", name: "Sarah Chen", imageUrl: "/api/placeholder/40/40", isOnline: true },
    { id: 3, clerkId: "user_3", name: "Mike Johnson", imageUrl: "/api/placeholder/40/40", isOnline: false },
    { id: 4, clerkId: "user_4", name: "Emma Davis", imageUrl: "/api/placeholder/40/40", isOnline: true },
  ];

  const handleChatClick = (user) => {
    onOpenChat(user);
    setShowChatList(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center px-4 py-4 gap-3 border-b border-gray-800">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
        </svg>
        <h2 className="text-lg font-bold text-white">Playlist's</h2>
      </div>

      {/* Playlist Items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent px-2 py-2">
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/playlist/${playlist.id}?name=${encodeURIComponent(
              playlist.name
            )}&artist=${encodeURIComponent(
              playlist.artist
            )}&gradient=${encodeURIComponent(playlist.gradient)}`}
          >
            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition cursor-pointer group">
              {/* Album Cover */}
              <div className="relative w-14 h-14 flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded overflow-hidden">
                {playlist.image ? (
                  <img
                    src={playlist.image}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Playlist Info */}
              <div className="flex-1 overflow-hidden">
                <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition">
                  {playlist.name}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {playlist.type} • {playlist.artist}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chat Button - Fixed at Bottom */}
      <div className="p-4 border-t border-gray-800 bg-[#121212]">
        <button
          onClick={() => setShowChatList(!showChatList)}
          className="w-full relative group"
        >
          {/* Glowing Background Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
          
          {/* Button Content */}
          <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
            {showChatList && <X className="w-4 h-4 ml-1" />}
          </div>
        </button>
      </div>

      {/* Chat List Popup */}
      {showChatList && (
        <div className="absolute bottom-20 left-0 right-0 mx-4 bg-[#1a1a1a] rounded-lg shadow-2xl border border-gray-700 max-h-80 overflow-hidden z-50 animate-slideUp">
          {/* Chat List Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#0f0f0f]">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-400" />
              Active Chats
            </h3>
            <button
              onClick={() => setShowChatList(false)}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Users List */}
          <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-gray-700">
            {chatUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active chats</p>
              </div>
            ) : (
              chatUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleChatClick(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors border-b border-gray-800/50"
                >
                  {/* User Avatar */}
                  <div className="relative">
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a1a]"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    <p className="text-gray-400 text-xs">
                      {user.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}