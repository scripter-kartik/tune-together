"use client";

import { useState, useEffect } from "react";
import { Home, Users, Compass, Plus, Disc, Radio, MessageCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getSocket } from "../lib/socket";

/**
 * Discord-style leftmost icon rail. On desktop it's a static column; on
 * mobile it's embedded inside the library drawer (rail + panel side by side).
 * `onNavigate` fires on taps that leave the drawer context (chat page, join /
 * create room, friends) so the drawer can close; plain tab switches (Home,
 * Explore) render inside the adjacent panel and keep it open.
 * `onOpenFriends` overrides the Friends tab (mobile opens the right drawer
 * instead of the desktop right panel).
 */
export default function SidebarRail({ activeView, onTabChange, onNavigate, onOpenFriends }) {
  const [publicRooms, setPublicRooms] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    
    const fetchRooms = () => socket.emit("get-public-rooms");
    
    socket.on("public-rooms", (rooms) => {
      setPublicRooms(rooms || []);
    });

    if (socket.connected) {
      fetchRooms();
    } else {
      socket.on("connect", fetchRooms);
    }
    
    // Refresh rooms every 10 seconds
    const timer = setInterval(fetchRooms, 10000);

    return () => {
      socket.off("public-rooms");
      socket.off("connect", fetchRooms);
      clearInterval(timer);
    };
  }, []);

  const createRoom = () => {
    window.dispatchEvent(new CustomEvent("tt-join-room", { detail: uuidv4() }));
    onNavigate?.();
  };

  const tabs = [
    { id: 'library', icon: Home, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Chats' },
    { id: 'messages', icon: Users, label: 'Friends' },
    { id: 'explore', icon: Compass, label: 'Explore Rooms' },
  ];

  return (
    <div className="w-[72px] flex-shrink-0 bg-[#000000] flex flex-col items-center py-4 gap-4 h-full border-r border-white/5">
      {/* App Icon */}
      <div
        onClick={() => onTabChange('library')}
        className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center cursor-pointer shadow-lg shadow-green-500/20 hover:scale-105 transition-all mb-2"
      >
        <Disc className="w-7 h-7 text-black fill-black/20 animate-[spin_4s_linear_infinite]" />
      </div>

      <div className="w-8 h-[2px] bg-white/10 rounded-full mb-2" />

      {/* Main Tabs */}
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <div key={tab.id} className="relative group flex items-center justify-center w-full">
            {/* Discord-like left indicator pill */}
            <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${isActive ? 'h-10' : 'h-0 group-hover:h-5'}`} />
            
            <button
              onClick={() => {
                if (tab.id === 'messages') {
                  if (onOpenFriends) onOpenFriends();
                  else window.dispatchEvent(new CustomEvent("tt-open-dms"));
                  onNavigate?.();
                } else if (tab.id === 'chat') {
                  window.location.href = '/chat';
                } else {
                  onTabChange(tab.id);
                }
              }}
              className={`w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-300 ${
                (isActive && tab.id !== 'messages')
                  ? 'bg-green-500 text-black rounded-[16px]' 
                  : 'bg-[#181818] text-neutral-400 hover:bg-green-500 hover:text-black hover:rounded-[16px]'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-6 h-6" />
            </button>
          </div>
        );
      })}

      <div className="w-8 h-[2px] bg-white/10 rounded-full my-2" />

      {/* Public Rooms / Friends Rooms mockups */}
      <div className="relative group flex items-center justify-center w-full mt-2">
        <button
          onClick={createRoom}
          className="w-12 h-12 rounded-[24px] flex items-center justify-center bg-[#181818] text-green-400 hover:bg-green-500 hover:text-black hover:rounded-[16px] transition-all duration-300"
          title="Create a Room"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      {/* Active Rooms */}
      <div className="flex flex-col gap-2 mt-2 w-full">
        {publicRooms.map((room) => {
          const cover = room.currentSong?.album?.cover_medium || room.currentSong?.album?.cover_small || "https://api.dicebear.com/7.x/shapes/svg?seed=" + room.roomId;
          return (
            <div key={room.roomId} className="relative group flex items-center justify-center w-full">
              <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 h-0 group-hover:h-5`} />
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("tt-join-room", { detail: room.roomId }));
                  onNavigate?.();
                }}
                className="w-12 h-12 rounded-[24px] overflow-hidden flex items-center justify-center bg-[#181818] hover:rounded-[16px] transition-all duration-300 ring-2 ring-transparent hover:ring-green-500 relative"
                title={`${room.userCount} listening to ${room.currentSong?.title || "Music"}`}
              >
                <img src={cover} alt="Room" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] font-bold px-1 rounded-sm text-white">
                  {room.userCount}
                </div>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
