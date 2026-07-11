"use client";
import { useState, useEffect } from "react";
import { MessageCircle, Users, ListMusic } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import ListeningUsers from "./ListeningUsers";
import QueueList from "./QueueList";

export default function RightPanel({
  roomId,
  socketRef,
  queue = [],
  onRemoveFromQueue,
  onClearQueue,
}) {
  const [tab, setTab] = useState("community");

  // The player footer's Queue button opens this panel's Queue tab.
  useEffect(() => {
    const openQueue = () => setTab("queue");
    window.addEventListener("tt-open-queue", openQueue);
    return () => window.removeEventListener("tt-open-queue", openQueue);
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
        <button onClick={() => setTab("chat")} className={tabClass(tab === "chat")}>
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
        <button onClick={() => setTab("queue")} className={tabClass(tab === "queue")}>
          <ListMusic className="w-4 h-4" />
          Queue{queue.length > 0 ? ` (${queue.length})` : ""}
        </button>
        <button
          onClick={() => setTab("community")}
          className={tabClass(tab === "community")}
        >
          <Users className="w-4 h-4" />
          People
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "chat" && <ChatSidebar roomId={roomId} socketRef={socketRef} />}
        {tab === "queue" && (
          <QueueList
            queue={queue}
            onRemove={onRemoveFromQueue}
            onClear={onClearQueue}
          />
        )}
        {tab === "community" && <ListeningUsers />}
      </div>
    </div>
  );
}
