"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { MessageCircle, X, ArrowLeft } from "lucide-react";

export default function PlaylistSidebar({ onOpenChat }) {
  const [showChatList, setShowChatList] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch users when switching to chat view
  useEffect(() => {
    if (showChatList) {
      fetchChatUsers();
    }
  }, [showChatList]);

  const fetchChatUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/logged-in');
      if (response.ok) {
        const data = await response.json();
        setChatUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching chat users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (user) => {
    if (onOpenChat) {
      onOpenChat(user);
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0];
  };

  // Get random color for avatar
  const getAvatarColor = (index) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-4 gap-3 border-b border-gray-800">
        {showChatList && (
          <button
            onClick={() => setShowChatList(false)}
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <svg
          className="w-6 h-6 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {showChatList ? (
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          ) : (
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          )}
        </svg>
        <h2 className="text-lg font-bold text-white">
          {showChatList ? "Messages" : "Playlist's"}
        </h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {!showChatList ? (
          // Playlist Items
          <div className="px-2 py-2">
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
        ) : (
          // Chat Users List
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              </div>
            ) : chatUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="w-16 h-16 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">No users available</p>
              </div>
            ) : (
              chatUsers.map((user, index) => (
                <div
                  key={user.clerkId}
                  onClick={() => handleChatClick(user)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  {/* User Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full ${getAvatarColor(
                          index
                        )} flex items-center justify-center text-white font-semibold text-sm`}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}
                    {/* Status indicator */}
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 ${
                        user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                      } rounded-full border-2 border-[#121212]`}
                    ></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {user.name}
                    </p>
                    {user.currentlyPlaying?.songTitle ? (
                      <p className="text-green-400 text-xs truncate">
                        🎵 {user.currentlyPlaying.songTitle}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs">
                        {user.status === 'online' ? 'Online' : 'Offline'}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Messages Button - Fixed at Bottom */}
      <div className="p-4 border-t border-gray-800 bg-[#121212]">
        <button
          onClick={() => setShowChatList(!showChatList)}
          className="w-full relative group"
        >
          {/* Glowing Background Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse"></div>

          {/* Button Content */}
          <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg">
            {showChatList ? (
              <>
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Playlists</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                <span>Messages</span>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}