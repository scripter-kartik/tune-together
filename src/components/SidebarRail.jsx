"use client";

import { Home, Disc, MessageCircle, Search, Clock } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import FriendRequestBell from "./FriendRequestBell";
import ThemeSwitcher from "./ThemeSwitcher";

export default function SidebarRail({ activeView, onTabChange, onNavigate }) {
  const tabs = [
    { id: "library", icon: Home, label: "Home" },
    { id: "search", icon: Search, label: "Search" },
    { id: "history", icon: Clock, label: "History" },
    { id: "chat", icon: MessageCircle, label: "Chats" },
  ];

  return (
    <div className="w-[72px] flex-shrink-0 bg-black flex flex-col items-center py-4 gap-4 h-full border-r border-[var(--tt-divider)] overflow-hidden transition-colors">
      {}
      <div
        onClick={() => onTabChange("library")}
        className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center cursor-pointer shadow-lg shadow-green-500/20 hover:scale-105 transition-all mb-2 flex-shrink-0"
      >
        <Disc className="w-7 h-7 text-black fill-black/20 animate-[spin_4s_linear_infinite]" />
      </div>

      <div className="w-8 h-[2px] bg-[var(--tt-divider)] rounded-full flex-shrink-0" />

      <div className="flex-1 flex flex-col gap-4 items-center w-full min-h-0 overflow-y-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <div key={tab.id} className="relative group flex items-center justify-center w-full flex-shrink-0">
              {}
              <div
                className={`absolute left-0 w-1 bg-green-500 rounded-r-full transition-all duration-300 ${
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

      {}
      <div className="flex flex-col gap-3 items-center w-full flex-shrink-0 pb-20 lg:pb-2">
        <FriendRequestBell />
        <ThemeSwitcher />
      </div>
    </div>
  );
}
