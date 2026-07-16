"use client";
import { useState, useEffect } from "react";
import { Users, ListMusic } from "lucide-react";
import QueueList from "./QueueList";
import FriendsListRight from "./FriendsListRight";

export default function RightPanel({
  queue = [],
  onRemoveFromQueue,
  onClearQueue,
}) {
  const [tab, setTab] = useState("dms");

  // The player footer's Queue button opens this panel's Queue tab.
  useEffect(() => {
    const openQueue = () => setTab("queue");
    const openDms = () => setTab("dms");
    
    window.addEventListener("tt-open-queue", openQueue);
    window.addEventListener("tt-open-dms", openDms);
    
    return () => {
      window.removeEventListener("tt-open-queue", openQueue);
      window.removeEventListener("tt-open-dms", openDms);
    };
  }, []);

  const tabClass = (active) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
      active
        ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
        : "bg-transparent text-neutral-400 hover:bg-neutral-800/80 hover:text-white"
    }`;

  return (
    <div className="w-full h-full flex flex-col bg-[#121212] overflow-hidden">
      <div className="flex gap-1 p-1.5 m-3 bg-[#1e1e1e] rounded-full border border-neutral-800 flex-shrink-0 shadow-inner">
        <button onClick={() => setTab("dms")} className={tabClass(tab === "dms")}>
          <Users className="w-4 h-4" />
          Friends
        </button>
        <button onClick={() => setTab("queue")} className={tabClass(tab === "queue")}>
          <ListMusic className="w-4 h-4" />
          Queue{queue.length > 0 ? ` (${queue.length})` : ""}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className={`absolute inset-0 w-full h-full ${tab === "dms" ? "flex flex-col" : "hidden"}`}>
          <FriendsListRight />
        </div>
        <div className={`absolute inset-0 w-full h-full ${tab === "queue" ? "flex flex-col" : "hidden"}`}>
          <QueueList
            queue={queue}
            onRemove={onRemoveFromQueue}
            onClear={onClearQueue}
          />
        </div>
      </div>
    </div>
  );
}
