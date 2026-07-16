"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0][0];
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'];

export default function FriendsListRight() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isSignedIn) {
      fetchChatUsers();
    }
  }, [isSignedIn, filter]);

  const fetchChatUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/logged-in?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setChatUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserStatus = (user) => {
    if (user.currentlyPlaying?.songTitle) {
      return { text: user.currentlyPlaying.songTitle, color: 'text-green-400', dot: 'bg-green-500' };
    }
    if (user.onlineStatus === 'online') return { text: 'Online', color: 'text-green-400', dot: 'bg-green-500' };
    if (user.onlineStatus === 'idle') return { text: `Active ${user.minutesSinceActive}m ago`, color: 'text-yellow-400', dot: 'bg-yellow-500' };
    return { text: 'Offline', color: 'text-neutral-500', dot: 'bg-neutral-600' };
  };

  const onlineCount = chatUsers.filter(u => u.onlineStatus === 'online').length;
  const recentCount = chatUsers.filter(u => u.onlineStatus === 'online' || u.onlineStatus === 'idle').length;

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="p-3 border-b border-neutral-800">
        <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-full mb-3">
          {[
            { key: 'all', label: 'All' },
            { key: 'online', label: `Online (${onlineCount})` },
            { key: 'recent', label: `Recent` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-2 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${
                filter === tab.key ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-neutral-800">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : chatUsers.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center px-4">
            <MessageCircle className="w-10 h-10 text-neutral-700 mb-3" />
            <p className="text-neutral-500 text-xs font-medium">
              {filter === 'online' ? 'No friends online' : 'No friends found'}
            </p>
          </div>
        ) : (
          chatUsers.map((user, i) => {
            const status = getUserStatus(user);
            return (
              <div
                key={user.clerkId}
                onClick={() => router.push(`/chat?dm=${user.clerkId}`)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer group"
              >
                <div className="relative flex-shrink-0">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-semibold text-sm shadow-sm group-hover:scale-105 transition-transform`}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 ${status.dot} rounded-full border-2 border-[#121212] shadow-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                  <p className={`text-[11px] truncate mt-0.5 font-medium ${status.color}`}>{status.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
