"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, ArrowLeft, Circle, Music, Plus, Library, Home, Trash2 } from "lucide-react";
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
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/playlists")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCustomPlaylists(data.playlists);
        }
      });
  }, [isSignedIn]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlaylistName }),
    });
    const data = await res.json();
    if (data.success) {
      setCustomPlaylists([data.playlist, ...customPlaylists]);
      setNewPlaylistName("");
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    const res = await fetch(`/api/playlists?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setCustomPlaylists(customPlaylists.filter(p => p._id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">

      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4 text-neutral-400">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            <span className="font-bold text-white">Your Library</span>
          </div>
          {isSignedIn && (
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="text-neutral-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
              title="Create Playlist"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex flex-col gap-0.5">
          {isCreating && (
            <div className="flex flex-col gap-2 px-2 py-3 bg-neutral-900/50 rounded-lg mb-2">
              <input 
                type="text" 
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreatePlaylist()}
                className="bg-black border border-neutral-700 text-white px-3 py-1.5 rounded text-sm outline-none focus:border-green-500 transition-colors"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCreating(false)} className="text-xs text-neutral-400 hover:text-white px-2 py-1">Cancel</button>
                <button onClick={handleCreatePlaylist} className="text-xs bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1 rounded">Create</button>
              </div>
            </div>
          )}

          {customPlaylists.map(pl => (
            <div
              key={pl._id}
              onClick={() => onOpenPlaylist?.({ ...pl, id: pl._id, type: "User Playlist" })}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group relative"
            >
              <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                {pl.image ? (
                  <img src={pl.image} alt={pl.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br from-green-500 to-indigo-500 flex items-center justify-center`}>
                    <Music className="w-5 h-5 text-white/70" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-white text-sm font-medium truncate group-hover:text-green-400 transition-colors">{pl.name}</p>
                <p className="text-neutral-400 text-xs truncate">Playlist • {pl.songs?.length || 0} songs</p>
              </div>
              <button 
                onClick={(e) => handleDeletePlaylist(e, pl._id)}
                className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

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