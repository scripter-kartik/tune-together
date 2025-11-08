"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function ActiveUsers() {
  const [users, setUsers] = useState([]);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [activeChats, setActiveChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = (user) => {
    if (!activeChats.find(chat => chat.clerkId === user.clerkId)) {
      setActiveChats([...activeChats, user]);
    }
  };

  const closeChat = (userId) => {
    setActiveChats(activeChats.filter(chat => chat.clerkId !== userId));
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Active Users</h2>
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        Active Users ({users.length})
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {users.map((user) => (
          <div
            key={user.clerkId}
            className="relative bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => setHoveredUser(user.clerkId)}
            onMouseLeave={() => setHoveredUser(null)}
          >
            <div className="relative">
              <img
                src={user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/30"
              />
              <div className="absolute top-0 right-1/2 translate-x-6">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
            </div>

            <h3 className="text-white font-medium text-center text-sm mb-1 truncate">
              {user.name}
            </h3>
            
            {user.currentlyPlaying && (
              <p className="text-white/50 text-xs text-center truncate">
                🎵 {user.currentlyPlaying.songTitle}
              </p>
            )}

            {hoveredUser === user.clerkId && (
              <button
                onClick={() => openChat(user)}
                className="absolute inset-0 bg-purple-600/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-1 text-white font-semibold transition-all duration-300 hover:bg-purple-700"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">Message</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-white/60 text-center py-12">
          No other users online right now
        </div>
      )}

      <div className="fixed bottom-4 right-4 flex flex-row-reverse gap-4 z-50">
        {activeChats.map((user) => (
          <ChatWindow
            key={user.clerkId}
            user={user}
            onClose={() => closeChat(user.clerkId)}
          />
        ))}
      </div>
    </div>
  );
}