"use client";

import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const REACTIONS = ["❤️", "🔥", "😂", "🎉", "👏", "😢"];

export default function ReactionMenu({ socketRef, roomId, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendReaction = (reaction) => {
    if (roomId && socketRef.current && !disabled) {
      socketRef.current.emit("send-reaction", {
        roomId,
        reaction,
        user: user?.firstName || "Guest",
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`p-2 transition-colors ${
          isOpen ? "text-green-500" : "text-neutral-300 hover:text-white"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="React"
        title="React"
        disabled={disabled}
      >
        <SmilePlus size={18} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#282828] border border-[var(--tt-border)] rounded-full shadow-2xl flex items-center p-1.5 gap-1 animate-fade-in-up">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="text-xl hover:scale-125 transition-transform origin-bottom p-1.5 rounded-full hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
          {}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#282828]" />
        </div>
      )}
    </div>
  );
}
