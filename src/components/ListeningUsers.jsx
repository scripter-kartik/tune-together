import React, { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Users, Headphones, Music, Circle } from "lucide-react";

const ListeningUsers = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'online', 'recent'

  // Fetch users based on filter
  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/logged-in?filter=${filter}`);
        const data = await response.json();

        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Refresh users list every 30 seconds
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, filter]);

  // Get user initials for avatar
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

  // Determine user status with more detail
  const getUserStatus = (user) => {
    // If currently playing
    if (user.currentlyPlaying?.songTitle) {
      return {
        text: `Playing: ${user.currentlyPlaying.songTitle}`,
        color: 'text-green-400',
        indicator: 'bg-green-500',
        icon: <Music className="w-3 h-3" />,
        statusText: 'Playing'
      };
    }
    
    // Based on online status
    if (user.onlineStatus === 'online') {
      return {
        text: 'Online',
        color: 'text-green-400',
        indicator: 'bg-green-500',
        icon: <Circle className="w-3 h-3 fill-current" />,
        statusText: 'Online'
      };
    } else if (user.onlineStatus === 'idle') {
      return {
        text: `Active ${user.minutesSinceActive}m ago`,
        color: 'text-yellow-400',
        indicator: 'bg-yellow-500',
        icon: <Circle className="w-3 h-3 fill-current" />,
        statusText: 'Idle'
      };
    } else {
      return {
        text: 'Offline',
        color: 'text-gray-400',
        indicator: 'bg-gray-500',
        icon: <Circle className="w-3 h-3 fill-current" />,
        statusText: 'Offline'
      };
    }
  };

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="w-full h-full bg-[#121212] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  // Not signed in - Show login prompt
  if (!isSignedIn) {
    return (
      <div className="w-full h-full bg-[#121212] text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-800/50">
          <Users className="w-5 h-5" />
          <h1 className="font-semibold text-base">What they're listening to</h1>
        </div>

        {/* Login Prompt */}
        <div className="flex flex-col gap-10 justify-center items-center text-center flex-1 px-8">
          <div className="relative">
            <div
              className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 
              rounded-full blur-lg opacity-75 animate-pulse"
              aria-hidden="true"
            ></div>

            <div className="relative bg-zinc-900 rounded-full p-4">
              <Headphones className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="font-bold text-lg">See What Friends Are Playing</h1>
            <p className="text-sm text-gray-400">
              Login to discover what music your friends are enjoying right now
            </p>
            <SignInButton mode="modal">
              <button className="text-emerald-400 text-sm hover:underline cursor-pointer font-medium mt-2">
                Log in
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  // Count users by status
  const onlineCount = users.filter(u => u.onlineStatus === 'online').length;
  const idleCount = users.filter(u => u.onlineStatus === 'idle').length;
  const offlineCount = users.filter(u => u.onlineStatus === 'offline').length;

  // Signed in - Show users list
  return (
    <div className="w-full h-full bg-[#121212] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800/50">
        <div className="flex items-center px-4 py-3 gap-3">
          <Users className="w-5 h-5" />
          <h1 className="font-semibold text-base">Community</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === 'online'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            Online ({onlineCount})
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === 'recent'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            Recent ({onlineCount + idleCount})
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <Users className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              {filter === 'online' ? 'No users online right now' : 'No users found'}
            </p>
          </div>
        ) : (
          users.map((user, idx) => {
            const status = getUserStatus(user);
            return (
              <div
                key={user.clerkId}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full ${getAvatarColor(idx)} flex items-center justify-center text-sm font-semibold`}
                    >
                      {getInitials(user.name)}
                    </div>
                  )}
                  {/* Status indicator */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 ${status.indicator} rounded-full border-2 border-[#121212]`}></div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px] truncate">{user.name}</p>
                  <div className="flex items-center gap-1">
                    {status.icon}
                    <p className={`text-xs ${status.color} truncate`}>{status.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListeningUsers;