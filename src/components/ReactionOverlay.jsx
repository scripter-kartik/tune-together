"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export default function ReactionOverlay({ roomId }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    
    const handleReaction = (data) => {
      setReactions((prev) => [...prev, data]);

      setTimeout(() => {
        setReactions((prev) => prev.filter(r => r.id !== data.id));
      }, 3000);
    };

    socket.on("room-reaction", handleReaction);

    return () => {
      socket.off("room-reaction", handleReaction);
    };
  }, [roomId]);

  if (!roomId || reactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[100px] right-4 md:right-8 z-[100] flex flex-col justify-end items-end gap-2 h-[300px] overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="animate-fade-up bg-black/60 backdrop-blur-xl border border-[var(--tt-border)] text-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg will-change-transform"
        >
          <span className="text-xl filter drop-shadow-md">{r.reaction}</span>
          {r.user && (
            <span className="text-xs font-bold text-neutral-200">
              {r.user}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
