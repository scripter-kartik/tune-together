"use client";

import { Home, Disc, MessageCircle, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

/**
 * Discord-style leftmost icon rail. On desktop it's a static column; on
 * mobile it's embedded inside the library drawer (rail + panel side by side).
 * `onNavigate` fires on taps that leave the drawer context (the chat page) so
 * the drawer can close; plain tab switches (Home) render inside the adjacent
 * panel and keep it open.
 *
 * Trimmed to the two things that matter: your library (Home) and Chats.
 * The old "rooms" concept (Explore Rooms, Create a Room, public-rooms rail,
 * Friends tab) was removed — listening together now happens inside a chat.
 */
export default function SidebarRail({ activeView, onTabChange, onNavigate }) {
  const tabs = [
    { id: "library", icon: Home, label: "Home" },
    { id: "search", icon: Search, label: "Search" },
    { id: "chat", icon: MessageCircle, label: "Chats" },
  ];

  return (
    <div className="w-[72px] flex-shrink-0 bg-[#000000] flex flex-col items-center py-4 gap-4 h-full border-r border-white/5">
      {/* App Icon */}
      <div
        onClick={() => onTabChange("library")}
        className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center cursor-pointer shadow-lg shadow-green-500/20 hover:scale-105 transition-all mb-2"
      >
        <Disc className="w-7 h-7 text-black fill-black/20 animate-[spin_4s_linear_infinite]" />
      </div>

      <div className="w-8 h-[2px] bg-white/10 rounded-full mb-2" />

      <div className="flex-1 flex flex-col gap-4 items-center w-full">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <div key={tab.id} className="relative group flex items-center justify-center w-full">
              {/* Discord-like left indicator pill */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${
                  isActive ? "h-10" : "h-0 group-hover:h-5"
                }`}
              />
              <button
                onClick={() => {
                  if (tab.id === "search") {
                    const searchInput = document.querySelector('input[type="text"][placeholder*="play"]');
                    if (searchInput) searchInput.focus();
                    onNavigate?.();
                    return;
                  }
                  onTabChange(tab.id);
                  if (tab.id === "chat") onNavigate?.();
                }}
                className={`w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-green-500 text-black rounded-[16px]"
                    : "bg-[#181818] text-neutral-400 hover:bg-green-500 hover:text-black hover:rounded-[16px]"
                }`}
                title={tab.label}
              >
                <tab.icon className="w-6 h-6" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-auto mb-4 flex flex-col gap-4 items-center w-full">
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-10 h-10 hover:scale-105 transition-all shadow-lg"
            }
          }}
        />
      </div>
    </div>
  );
}
