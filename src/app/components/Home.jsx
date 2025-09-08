import ChatSidebar from "./ChatSidebar";
import InviteSidebar from "./InviteSidebar";
import MusicCards from "./MusicCards";

export default function Home({
  songs,
  onLoadMore,
  showLoadMore,
  visibleCount,
  onPlay,
}) {
  const isLoading = songs.length === 0;
  const username = "User" + Math.floor(Math.random() * 1000);
  const inviteLink = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="px-2 py-2 flex gap-2">
      <div className="w-110 min-h-screen bg-[#121212] rounded-md">
        <ChatSidebar username={username} />
      </div>

      <div className="w-285 bg-[#121212] rounded-md flex flex-col items-center">
        {isLoading ? (
          <p className="text-white mt-10 text-lg">Loading songs...</p>
        ) : (
          <>
            <MusicCards songs={songs} onPlay={onPlay} />
            {showLoadMore && (
              <div className="mt-6 mb-10 m-2">
                <button
                  onClick={onLoadMore}
                  className="bg-green-500 text-white font-semibold px-6 py-2 rounded hover:bg-green-600 transition"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-75 bg-[#121212] rounded-md">
        <InviteSidebar inviteLink={inviteLink} />
      </div>
    </div>
  );
}
