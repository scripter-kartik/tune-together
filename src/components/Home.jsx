// src/components/Home.jsx

import PlaylistSidebar from "./PlaylistSidebar";
import MusicCards from "./MusicCards";
import ListeningUsers from "./ListeningUsers";

export default function Home({
  songs,
  onLoadMore,
  showLoadMore,
  onPlay,
  isLoading,
  error,
  roomId,
  socketRef,
}) {
  return (
    <div className="px-2 py-2 flex flex-col lg:flex-row gap-2">
      {/* Playlist Sidebar - Always visible */}
      <div className="hidden lg:block lg:w-80 h-[calc(100vh-160px)] rounded-md">
        <PlaylistSidebar />
      </div>

      {/* Main Content - This is what changes */}
      <div className="flex-1 bg-[#121212] rounded-md flex flex-col items-center h-[calc(100vh-160px)] overflow-y-auto py-3">
        {error && (
          <div className="w-full bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-md m-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4" />
            <p className="text-white text-lg">Loading songs...</p>
          </div>
        ) : songs.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <p className="text-gray-400 text-lg">No songs available</p>
          </div>
        ) : (
          <div className="scrollbar overflow-y-auto w-full">
            <MusicCards songs={songs} onPlay={onPlay} />
            {showLoadMore && (
              <div className="mt-6 mb-10 m-2">
                <button
                  onClick={onLoadMore}
                  className="bg-green-500 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-600 transition transform hover:scale-105"
                >
                  Load More Songs
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listening Users Sidebar - Always visible, auto-switches on login */}
      <div className="hidden lg:block lg:w-80 rounded-md h-[calc(100vh-160px)] overflow-hidden">
        <ListeningUsers />
      </div>
    </div>
  );
}