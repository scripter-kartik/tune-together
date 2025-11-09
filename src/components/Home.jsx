'use client'

import { useState } from "react";
import MusicCards from "./MusicCards";
import PlaylistSidebar from "./PlaylistSidebar";
import ListeningUsers from "./ListeningUsers";
import ChatView from "./ChatView";
import { Menu, X } from "lucide-react";

export default function Home({
  songs,
  onLoadMore,
  showLoadMore,
  onPlay,
  isLoading,
  error,
  roomId,
  socketRef,
  onOpenChat,
  selectedChatUser,
}) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-0 md:gap-2 p-0 md:p-2 bg-black overflow-hidden">

      <div className="flex md:hidden gap-2 p-2 bg-black border-b border-neutral-800 flex-shrink-0">
        <button
          onClick={() => setShowLeft(!showLeft)}
          className="flex-1 bg-[#1e1e1e] hover:bg-[#2e2e2e] text-white px-3 py-2 rounded text-sm font-medium transition flex items-center justify-center gap-1"
        >
          <Menu size={16} />
          <span>Playlist</span>
        </button>
        <button
          onClick={() => setShowRight(!showRight)}
          className="flex-1 bg-[#1e1e1e] hover:bg-[#2e2e2e] text-white px-3 py-2 rounded text-sm font-medium transition flex items-center justify-center gap-1"
        >
          <Menu size={16} />
          <span>Users</span>
        </button>
      </div>

      <div className="hidden md:flex md:w-72 lg:w-80 flex-shrink-0 bg-[#1e1e1e] rounded-lg overflow-hidden flex-col h-full">
        <PlaylistSidebar onOpenChat={onOpenChat} />
      </div>

      {showLeft && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowLeft(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 sm:w-72 bg-[#1e1e1e] rounded-r-lg shadow-xl flex flex-col z-50 overflow-hidden max-h-screen pb-[105px]">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800 flex-shrink-0">
              <h3 className="text-white font-semibold text-sm">Playlist</h3>
              <button
                onClick={() => setShowLeft(false)}
                className="p-1.5 hover:bg-[#2e2e2e] rounded transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PlaylistSidebar onOpenChat={onOpenChat} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-[#121212] rounded-lg flex flex-col min-w-0 overflow-y-auto scrollbar  h-full">

        {selectedChatUser ? (
          <div className="flex-1 overflow-y-auto">
            <ChatView
              user={selectedChatUser}
              onClose={() => onOpenChat(null)}
            />
          </div>

        ) : (
          <>
            {error && (
              <div className="w-full bg-red-500/20 border-b border-red-500 text-red-200 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm flex-shrink-0">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 md:h-12 w-10 md:w-12 border-t-2 border-b-2 border-green-500 mb-4" />
                <p className="text-white text-sm md:text-lg">Loading songs...</p>
              </div>
            ) : songs.length === 0 && !error ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-gray-400 text-sm md:text-lg">No songs available</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <MusicCards songs={songs} onPlay={onPlay} />
                </div>

                {showLoadMore && (
                  <div className="flex-shrink-0 p-3 md:p-4 flex justify-center border-t border-neutral-800 bg-[#121212]">
                    <button
                      onClick={onLoadMore}
                      className="bg-green-500 hover:bg-green-600 text-black font-bold px-2 py-2 rounded-full transition transform hover:scale-105 text-sm md:text-base whitespace-nowrap shadow-lg"
                    >
                        <img className="w-6 h-6" src="/down-arrow.png" alt="" />
                      </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      <div className="hidden md:flex md:w-72 lg:w-80 flex-shrink-0 bg-[#1e1e1e] rounded-lg overflow-hidden flex-col h-full">
        <ListeningUsers />
      </div>

      {showRight && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowRight(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-64 sm:w-72 bg-[#1e1e1e] rounded-l-lg shadow-xl flex flex-col z-50 overflow-hidden max-h-screen pb-[105px]">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800 flex-shrink-0">
              <h3 className="text-white font-semibold text-sm">Users</h3>
              <button
                onClick={() => setShowRight(false)}
                className="p-1.5 hover:bg-[#2e2e2e] rounded transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ListeningUsers />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}