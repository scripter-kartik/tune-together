// ============================================
// FILE 1: src/components/ActiveUsersSidebar.jsx (NEW)
// ============================================

"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

export default function ActiveUsersSidebar({ onUserClick }) {
  const [users, setUsers] = useState([]);
  const [hoveredUser, setHoveredUser] = useState(null);

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('/api/users/logged-in');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  return (
    <div className="w-64 bg-black/40 backdrop-blur-lg border-r border-white/10 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-white font-bold text-lg mb-4">
          Online ({users.length})
        </h2>
        
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.clerkId}
              className="relative group"
              onMouseEnter={() => setHoveredUser(user.clerkId)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              <div
                onClick={() => onUserClick(user)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                {/* Avatar with green dot */}
                <div className="relative flex-shrink-0">
                  <img
                    src={user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-white/20"
                  />
                  {/* Green dot indicator */}
                  <div className="absolute bottom-0 right-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {user.name}
                  </p>
                  {user.currentlyPlaying ? (
                    <p className="text-green-400 text-xs truncate">
                      🎵 {user.currentlyPlaying.songTitle}
                    </p>
                  ) : (
                    <p className="text-white/50 text-xs">Online</p>
                  )}
                </div>

                {/* Message icon on hover */}
                {hoveredUser === user.clerkId && (
                  <MessageCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-white/50 text-sm text-center py-8">
            No users online
          </div>
        )}
      </div>
    </div>
  );
}