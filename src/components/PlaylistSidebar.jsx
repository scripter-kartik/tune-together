"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, ArrowLeft, Circle, Music, Plus, Library, Home } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { PLAYLISTS } from "../lib/constants";

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0][0];
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'];

export default function PlaylistSidebar({ onOpenChat, onOpenPlaylist }) {
  const { isSignedIn, isLoaded } = useUser();
  const [view, setView] = useState('library'); // 'library' | 'messages'
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [listMode, setListMode] = useState('list'); // 'list' | 'compact'

  useEffect(() => {
    if (view === 'messages' && isSignedIn) {
      fetchChatUsers();
    }
  }, [view, isSignedIn, filter]);

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

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setView(view === 'library' ? 'messages' : 'library')}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            {view === 'messages' ? (
              <>
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold text-white">Messages</span>
              </>
            ) : (
              <>
                <Library className="w-5 h-5" />
                <span className="font-bold text-white">Your Library</span>
              </>
            )}
          </button>
          {view === 'library' && isLoaded && isSignedIn && (
            <button
              onClick={() => setView('messages')}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Messages"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {view === 'messages' && (
          <div className="flex gap-1 mb-3">
            {[
              { key: 'all', label: `All (${chatUsers.length})` },
              { key: 'online', label: `Online (${onlineCount})` },
              { key: 'recent', label: `Recent (${recentCount})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === tab.key ? 'bg-white text-black' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {view === 'library' ? (
          <div className="flex flex-col gap-0.5">
            {PLAYLISTS.map(pl => (
              <div
                key={pl.id}
                onClick={() => onOpenPlaylist?.(pl)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                  {pl.image ? (
                    <img src={pl.image} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${pl.gradient} flex items-center justify-center`}>
                      <Music className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition-colors">{pl.name}</p>
                  <p className="text-neutral-400 text-xs truncate">{pl.type} • {pl.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
            </div>
          ) : chatUsers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <MessageCircle className="w-12 h-12 text-neutral-600 mb-3" />
              <p className="text-neutral-400 text-sm">
                {filter === 'online' ? 'No users online right now' : 'No users found'}
              </p>
            </div>
          ) : (
            chatUsers.map((user, i) => {
              const status = getUserStatus(user);
              return (
                <div
                  key={user.clerkId}
                  onClick={() => onOpenChat?.(user)}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    {user.imageUrl ? (
                      <img src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${status.dot} rounded-full border-2 border-[#121212]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className={`text-xs truncate ${status.color}`}>{status.text}</p>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}