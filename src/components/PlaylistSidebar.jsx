"use client";

import Link from "next/link";

export default function PlaylistSidebar() {
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

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-md overflow-hidden">
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
    </div>
  );
}
