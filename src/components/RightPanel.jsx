"use client";
import { useState, useEffect } from "react";
import QueueList from "./QueueList";
import ListeningUsers from "./ListeningUsers";
import SidebarLyrics from "./SidebarLyrics";
import { ListMusic, Users, MicVocal } from "lucide-react";

export default function RightPanel({
  queue = [],
  currentSong,
  onRemoveFromQueue,
  onClearQueue,
  recentHistory,
  onPlay,
}) {
  const [activeTab, setActiveTab] = useState("queue");

  useEffect(() => {
    const handleOpenQueue = () => setActiveTab("queue");
    window.addEventListener("tt-open-queue", handleOpenQueue);
    return () => window.removeEventListener("tt-open-queue", handleOpenQueue);
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col bg-[#121212] overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b border-neutral-800 flex-shrink-0 gap-4 mt-2">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "queue"
              ? "border-green-400 text-green-400"
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <ListMusic className="w-4 h-4" />
          Queue{queue.length > 0 ? ` (${queue.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "community"
              ? "border-green-400 text-green-400"
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Friends
        </button>
        <button
          onClick={() => setActiveTab("lyrics")}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "lyrics"
              ? "border-green-400 text-green-400"
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <MicVocal className="w-4 h-4" />
          Lyrics
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "queue" ? (
          <QueueList
            queue={queue}
            currentSong={currentSong}
            onRemove={onRemoveFromQueue}
            onClear={onClearQueue}
          />
        ) : activeTab === "lyrics" ? (
          <SidebarLyrics song={currentSong} />
        ) : (
          <ListeningUsers />
        )}
      </div>
    </div>
  );
}
