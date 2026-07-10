'use client'

import { useState } from "react";
import MusicCards from "./MusicCards";
import PlaylistSidebar from "./PlaylistSidebar";
import RightPanel from "./RightPanel";
import ChatView from "./ChatView";
import ArtistView from "./ArtistView";
import AlbumView from "./AlbumView";
import { Menu, X, Music2, AudioWaveform } from "lucide-react";

export default function Home({
  songs,
  onLoadMore,
  showLoadMore,
  onPlay,
  onQueue,
  currentSongId,
  isPlaying,
  queue,
  onRemoveFromQueue,
  onClearQueue,
  isLoading,
  error,
  roomId,
  socketRef,
  onOpenChat,
  selectedChatUser,
  selectedArtistId,
  onOpenArtist,
  selectedAlbumId,
  onOpenAlbum,
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
          <span>Chat</span>
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

        ) : selectedAlbumId ? (
          <AlbumView
            albumId={selectedAlbumId}
            onClose={() => onOpenAlbum(null)}
            onPlay={onPlay}
            onQueue={onQueue}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onOpenArtist={onOpenArtist}
          />
        ) : selectedArtistId ? (
          <ArtistView
            artistId={selectedArtistId}
            onClose={() => onOpenArtist(null)}
            onPlay={onPlay}
            onQueue={onQueue}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onOpenAlbum={onOpenAlbum}
          />
        ) : (
          <>
            {error && (
              <div className="w-full bg-red-500/20 border-b border-red-500 text-red-200 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm flex-shrink-0">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex-1 overflow-y-auto scrollbar p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 md:p-4 rounded-xl bg-[#181818] flex flex-col w-full border border-neutral-800/30"
                    >
                      <div 
                        className="w-full aspect-square rounded-lg mb-4 bg-neutral-800 animate-pulse relative overflow-hidden"
                        style={{ animationDelay: `${(i % 8) * 0.1}s` }}
                      >
                         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-neutral-700/10 to-transparent" />
                      </div>
                      <div className="w-full px-1 flex flex-col gap-2.5">
                        <div 
                          className="h-3.5 w-3/4 rounded-full bg-neutral-800 animate-pulse"
                          style={{ animationDelay: `${(i % 8) * 0.1 + 0.1}s` }}
                        />
                        <div 
                          className="h-2.5 w-1/2 rounded-full bg-neutral-800/70 animate-pulse"
                          style={{ animationDelay: `${(i % 8) * 0.1 + 0.2}s` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : songs.length === 0 && !error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="bg-[#1e1e1e] rounded-full p-5">
                  <Music2 className="w-8 h-8 text-neutral-600" />
                </div>
                <p className="text-white text-sm md:text-lg font-medium">No songs available</p>
                <p className="text-gray-500 text-xs md:text-sm">Try searching for a mood, genre, or artist up top.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <MusicCards
                    songs={songs}
                    onPlay={onPlay}
                    onQueue={onQueue}
                    currentSongId={currentSongId}
                    isPlaying={isPlaying}
                    onOpenArtist={onOpenArtist}
                  />
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
        <RightPanel
          roomId={roomId}
          socketRef={socketRef}
          queue={queue}
          onRemoveFromQueue={onRemoveFromQueue}
          onClearQueue={onClearQueue}
        />
      </div>

      {showRight && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowRight(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-64 sm:w-72 bg-[#1e1e1e] rounded-l-lg shadow-xl flex flex-col z-50 overflow-hidden max-h-screen pb-[105px]">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800 flex-shrink-0">
              <h3 className="text-white font-semibold text-sm">Room</h3>
              <button
                onClick={() => setShowRight(false)}
                className="p-1.5 hover:bg-[#2e2e2e] rounded transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RightPanel
                roomId={roomId}
                socketRef={socketRef}
                queue={queue}
                onRemoveFromQueue={onRemoveFromQueue}
                onClearQueue={onClearQueue}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}