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

export default function PlaylistSidebar({ onOpenPlaylist }) {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="flex flex-col h-full bg-[#121212]">

      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-4 text-neutral-400">
          <Library className="w-5 h-5" />
          <span className="font-bold text-white">Your Library</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
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
      </div>
    </div>
  );
}