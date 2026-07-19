"use client";

import { useState, useEffect } from "react";
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
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center px-6 -mt-4">
            <svg viewBox="0 0 200 160" className="w-40 h-32 mb-4 tt-empty-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ttVinylShine" cx="35%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#2e4436" />
                  <stop offset="55%" stopColor="#16241b" />
                  <stop offset="100%" stopColor="#0a120d" />
                </radialGradient>
                <linearGradient id="ttLabel" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Breathing glow + expanding sound ripples behind the vinyl */}
              <circle cx="100" cy="78" r="58" fill="#10b981" opacity="0.08" className="tt-empty-glow" />
              <circle cx="100" cy="78" r="40" stroke="#10b981" strokeWidth="1.5" className="tt-empty-ripple" />
              <circle cx="100" cy="78" r="40" stroke="#10b981" strokeWidth="1.5" className="tt-empty-ripple" style={{ animationDelay: '-1.5s' }} />

              {/* Vinyl record (spins) */}
              <g className="tt-empty-vinyl">
                <circle cx="100" cy="78" r="38" fill="url(#ttVinylShine)" stroke="#052012" strokeWidth="1" />
                {/* Grooves */}
                <circle cx="100" cy="78" r="32" stroke="#1f5137" strokeWidth="0.75" opacity="0.9" />
                <circle cx="100" cy="78" r="27" stroke="#1f5137" strokeWidth="0.75" opacity="0.7" />
                <circle cx="100" cy="78" r="22" stroke="#1f5137" strokeWidth="0.75" opacity="0.9" />
                <circle cx="100" cy="78" r="17" stroke="#1f5137" strokeWidth="0.75" opacity="0.7" />
                {/* Light streak so the spin reads */}
                <path d="M100 44a34 34 0 0 1 24 10" stroke="#3e6b52" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d="M76 102a34 34 0 0 1-10-24" stroke="#2e5440" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              </g>

              {/* Light sheen sweeping over the surface (counter-rotates for depth) */}
              <g className="tt-empty-sheen" opacity="0.35">
                <path d="M100 42a36 36 0 0 1 30 16" stroke="#6ee7b7" strokeWidth="5" strokeLinecap="round" opacity="0.25" />
                <path d="M100 42a36 36 0 0 1 30 16" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              </g>

              {/* Center label thumps on the beat */}
              <g className="tt-empty-beat">
                <circle cx="100" cy="78" r="12" fill="url(#ttLabel)" />
                <circle cx="100" cy="78" r="2.5" fill="#06281a" />
                {/* Tiny note on the label */}
                <path d="M97.5 82v-6l5-1.5v6" stroke="#06281a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Tonearm resting on the record, rocking as it tracks */}
              <g className="tt-empty-arm">
                <path d="M156 30 L156 46 Q156 52 151 55 L132 66" stroke="#134e33" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M156 30 L156 46 Q156 52 151 55 L132 66" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
                {/* Headshell + stylus */}
                <rect x="126" y="62" width="10" height="7" rx="2" transform="rotate(-30 131 65.5)" fill="#059669" />
                {/* Pivot base */}
                <circle cx="156" cy="30" r="5.5" fill="#134e33" />
                <circle cx="156" cy="30" r="2.5" fill="#34d399" />
              </g>

              {/* Music notes orbiting the record (counter-rotated to stay upright) */}
              <g className="tt-empty-orbit">
                <g className="tt-empty-orbit-item">
                  <path d="M100 22v-9l8-2.5v9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="98" cy="22" r="3" fill="#10b981" />
                  <circle cx="106" cy="19.5" r="3" fill="#10b981" />
                </g>
                <g className="tt-empty-orbit-item">
                  <path d="M152 90v-8l6-2v8" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="150.5" cy="90" r="2.5" fill="#34d399" />
                  <circle cx="156.5" cy="88" r="2.5" fill="#34d399" />
                </g>
                <g className="tt-empty-orbit-item">
                  <path d="M52 100v-7" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="50" cy="100" r="2.5" fill="#6ee7b7" />
                </g>
              </g>

              {/* Equalizer bars dancing under the record */}
              <g>
                <rect x="70" y="126" width="5" height="18" rx="2.5" fill="#10b981" className="tt-empty-eq" />
                <rect x="80" y="126" width="5" height="18" rx="2.5" fill="#34d399" className="tt-empty-eq" style={{ animationDelay: '-0.2s' }} />
                <rect x="90" y="126" width="5" height="18" rx="2.5" fill="#10b981" className="tt-empty-eq" style={{ animationDelay: '-0.55s' }} />
                <rect x="100" y="126" width="5" height="18" rx="2.5" fill="#34d399" className="tt-empty-eq" style={{ animationDelay: '-0.35s' }} />
                <rect x="110" y="126" width="5" height="18" rx="2.5" fill="#10b981" className="tt-empty-eq" style={{ animationDelay: '-0.7s' }} />
                <rect x="120" y="126" width="5" height="18" rx="2.5" fill="#34d399" className="tt-empty-eq" style={{ animationDelay: '-0.1s' }} />
              </g>

              {/* Notes bubbling up out of the equalizer */}
              <g>
                <g className="tt-empty-rise">
                  <path d="M74 124v-6l4.5-1.4v6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="72.7" cy="124" r="2" fill="#34d399" />
                  <circle cx="78.5" cy="122.3" r="2" fill="#34d399" />
                </g>
                <g className="tt-empty-rise" style={{ animationDelay: '-1.2s' }}>
                  <path d="M99 122v-6" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="97.3" cy="122" r="2" fill="#6ee7b7" />
                </g>
                <g className="tt-empty-rise" style={{ animationDelay: '-2.3s' }}>
                  <path d="M121 123v-6l4.5-1.4v6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="119.7" cy="123" r="2" fill="#10b981" />
                  <circle cx="125.5" cy="121.3" r="2" fill="#10b981" />
                </g>
              </g>

              {/* Twinkling sparkles */}
              <circle cx="34" cy="36" r="2" fill="#10b981" className="tt-empty-twinkle" />
              <circle cx="168" cy="32" r="2.5" fill="#10b981" className="tt-empty-twinkle" style={{ animationDelay: '-0.7s' }} />
              <circle cx="176" cy="118" r="2" fill="#10b981" className="tt-empty-twinkle" style={{ animationDelay: '-1.4s' }} />
              <circle cx="26" cy="120" r="2.5" fill="#10b981" className="tt-empty-twinkle" style={{ animationDelay: '-2.1s' }} />
              <path d="M40 66l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#34d399" className="tt-empty-twinkle" style={{ animationDelay: '-1s' }} />
              <path d="M162 62l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#34d399" className="tt-empty-twinkle" style={{ animationDelay: '-1.8s' }} />
            </svg>
            <p className="text-white text-sm font-bold mb-1">
              {filter === 'online' ? 'No friends online' : 'No friends yet'}
            </p>
            <p className="text-neutral-500 text-xs font-medium leading-relaxed">
              {filter === 'online'
                ? 'Your friends will show up here when they hop on.'
                : 'Add friends to see who’s listening and vibe together.'}
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
