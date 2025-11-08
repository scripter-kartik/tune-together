import React, { useState, useEffect } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

const InviteFriend = () => {
  const { isSignedIn, user } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users from your API
    const fetchUsers = async () => {
      try {
        // Replace this with your actual API endpoint
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  // Mock data for demonstration (remove this when you have real API)
  const mockUsers = [
    { id: 1, name: "Alex Morgan", avatar: "/api/placeholder/40/40", song: "Blinding Lights", artist: "The Weeknd", isPlaying: true },
    { id: 2, name: "Sarah Chen", avatar: "/api/placeholder/40/40", song: "As It Was", artist: "Harry Styles", isPlaying: true },
    { id: 3, name: "Mike Johnson", avatar: "/api/placeholder/40/40", song: "Anti-Hero", artist: "Taylor Swift", isPlaying: false },
    { id: 4, name: "Emma Davis", avatar: "/api/placeholder/40/40", song: "Calm Down", artist: "Rema & Selena Gomez", isPlaying: true },
  ];

  if (!isSignedIn) {
    return (
      <div className="w-full h-full bg-[#121212]">
        {/* Header */}
        <div className="flex items-center px-3 py-4 justify-start gap-4 border-b border-gray-800">
          <img className="w-5 h-5" src="/users.png" alt="" />
          <h1 className="font-bold text-sm">What they're listening to</h1>
        </div>
        {/* Main Content - Not Signed In */}
        <div className="flex flex-col gap-10 justify-center items-center text-center h-full w-full p-14">
          <div className="relative">
            <div
              className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 
              rounded-full blur-lg opacity-75 animate-pulse"
              aria-hidden="true"
            ></div>

            <div className="relative bg-zinc-900 rounded-full p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-headphones text-emerald-400"
              >
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="font-bold text-lg">See What Friends Are Playing</h1>
            <p className="text-xs text-gray-400">
              Login to discover what music your friends are enjoying right now
            </p>
            <SignInButton mode="modal">
              <div className="flex items-center justify-center gap-1">
                <p className="text-green-400 text-[13px] hover:underline cursor-pointer">login</p>
              </div>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  // Use mockUsers for demo, replace with 'users' when API is ready
  const displayUsers = users.length > 0 ? users : mockUsers;

  return (
    <div className="w-full h-full bg-[#121212]">
      {/* Header */}
      <div className="flex items-center px-3 py-4 justify-start gap-4 border-b border-gray-800">
        <img className="w-5 h-5" src="/users.png" alt="" />
        <h1 className="font-bold text-sm">What they're listening to</h1>
      </div>

      {/* Users List */}
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <p>No friends online right now</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {displayUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-gray-800/30"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {user.isPlaying && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#121212] flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.song}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.artist}
                  </p>
                </div>

                {/* Message Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // This will be handled by parent component
                    window.dispatchEvent(new CustomEvent('openChat', { detail: user }));
                  }}
                  className="p-2 hover:bg-emerald-500/20 rounded-full transition-colors group/btn"
                  title="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400 group-hover/btn:text-emerald-400 transition-colors"
                  >
                    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
                  </svg>
                </button>

                {/* Playing indicator */}
                {user.isPlaying && (
                  <div className="flex gap-0.5 items-end h-4">
                    <div className="w-0.5 bg-emerald-400 animate-pulse h-2"></div>
                    <div className="w-0.5 bg-emerald-400 animate-pulse h-3" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-0.5 bg-emerald-400 animate-pulse h-4" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteFriend;