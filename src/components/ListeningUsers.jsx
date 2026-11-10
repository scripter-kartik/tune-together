import React, { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Users, Headphones, Music, Circle } from "lucide-react";

const ListeningUsers = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); 
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

    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, filter]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0];
  };

  const getAvatarColor = (index) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    return colors[index % colors.length];
  };

  const getUserStatus = (user) => {
    if (user.currentlyPlaying?.songTitle) {
      return {
        text: `Playing: ${user.currentlyPlaying.songTitle}`,
        color: 'text-green-400',
        indicator: 'bg-green-500',
        icon: <Music className="w-3 h-3" />,
        statusText: 'Playing'
      };
    }
    
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

  if (!isLoaded || loading) {
    return (
      <div className="flex-1 flex flex-col gap-1 px-2 sm:px-3 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-11 h-11 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-2.5 w-3/4 rounded bg-white/[0.06] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-10 gap-5">
        <div className="relative">
          <div className="absolute -inset-1 bg-green-500 rounded-full blur-lg opacity-30" aria-hidden="true" />
          <div className="relative w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center">
            <Headphones className="w-7 h-7 text-green-400" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-white font-bold text-base">See what friends are playing</p>
          <p className="text-sm text-neutral-400 max-w-[240px]">
            Log in to follow your friends&apos; listening in real time.
          </p>
        </div>
        <SignInButton mode="modal">
          <button type="button" className="h-10 px-6 rounded-full bg-white text-black text-sm font-bold hover:scale-[1.03] active:scale-100 transition">
            Log in
          </button>
        </SignInButton>
      </div>
    );
  }

  const onlineCount = users.filter(u => u.onlineStatus === 'online').length;
  const idleCount = users.filter(u => u.onlineStatus === 'idle').length;

  const filters = [
    { id: 'all', label: 'All', count: users.length },
    { id: 'online', label: 'Online', count: onlineCount },
    { id: 'recent', label: 'Recent', count: onlineCount + idleCount },
  ];

  return (
    <div className="flex-1 min-h-0 text-white overflow-hidden flex flex-col">
      <div className="flex-shrink-0 flex gap-1.5 px-4 sm:px-5 pb-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors touch-manipulation ${
              filter === f.id
                ? 'bg-green-500 text-black'
                : 'text-neutral-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1]'
            }`}
          >
            {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-md bg-red-500/10">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-white font-bold text-base">
              {filter === 'online' ? 'No one online right now' : 'No friends yet'}
            </p>
            <p className="text-sm text-neutral-400 mt-1.5">Add friends to see what they&apos;re listening to.</p>
          </div>
        ) : (
          users.map((user, idx) => {
            const status = getUserStatus(user);
            const playing = !!user.currentlyPlaying?.songTitle;
            return (
              <div
                key={user.clerkId}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                <div className="relative flex-shrink-0">
                  {user.imageUrl ? (
                    <img referrerPolicy="no-referrer"
                      src={user.imageUrl}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full ${getAvatarColor(idx)} flex items-center justify-center text-sm font-semibold uppercase`}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 ${status.indicator} rounded-full ring-2 ring-[color:var(--tt-bg)]`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">{user.name}</p>
                  {playing ? (
                    <p className="flex items-center gap-1.5 text-[13px] text-neutral-400 min-w-0">
                      <Music className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />
                      <span className="truncate">{user.currentlyPlaying.songTitle}</span>
                    </p>
                  ) : (
                    <p className={`text-[13px] truncate ${status.color}`}>{status.text}</p>
                  )}
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