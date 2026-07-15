"use client";
import { useEffect, useState } from "react";

export default function ReactionOverlay({ socketRef, roomId }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!roomId || !socketRef?.current) return;

    const socket = socketRef.current;
    
    const handleReaction = (data) => {
      // random starting X between 15% and 85% of screen width
      const left = 15 + Math.random() * 70;
      // random sway amplitude (-20px to 20px)
      const sway = (Math.random() - 0.5) * 40;
      // random scale variance
      const scale = 0.8 + Math.random() * 0.5;

      const newReaction = {
        ...data,
        left,
        sway,
        scale,
      };

      setReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter(r => r.id !== data.id));
      }, 4000);
    };

    socket.on("room-reaction", handleReaction);

    return () => {
      socket.off("room-reaction", handleReaction);
    };
  }, [roomId, socketRef]);

  if (!roomId || reactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0 animate-float-up will-change-transform flex flex-col items-center justify-center drop-shadow-2xl"
          style={{ 
            left: `${r.left}%`,
            '--tw-translate-x': `${r.sway}px`,
            transform: `scale(${r.scale}) translateX(var(--tw-translate-x))`
          }}
        >
          <div className="bg-black/20 backdrop-blur-md rounded-full w-14 h-14 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-3xl filter drop-shadow-lg leading-none m-0 p-0 block" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              {r.reaction}
            </span>
          </div>
          {r.user && (
            <div className="mt-2 text-[10px] font-bold text-white bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-full whitespace-nowrap border border-white/5 shadow-xl">
              {r.user}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
