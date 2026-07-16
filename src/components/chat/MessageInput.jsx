"use client";

import { useState, useRef } from "react";
import { Send, Smile } from "lucide-react";

const QUICK_EMOJIS = ["🔥", "💖", "🎵", "🤯", "😭", "👏", "😂", "❤️", "🙌", "✨"];

export default function MessageInput({ placeholder, onSend, onTyping, disabled, disabledHint }) {
  const [value, setValue] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const typingTimeoutRef = useRef(null);

  const send = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    setShowEmojis(false);
    onSend(text);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    if (!onTyping) return;
    onTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  return (
    <div className="px-4 pb-4 pt-1 relative">
      {showEmojis && (
        <div className="absolute bottom-full right-6 mb-1 bg-[#1e1e1e] border border-white/10 rounded-xl p-2 flex gap-1 shadow-xl z-10">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setValue((v) => v + e)}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-1 focus-within:border-green-500/50 transition">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={2000}
          disabled={disabled}
          placeholder={disabled ? disabledHint || "You can't send messages here" : placeholder}
          className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          onClick={() => setShowEmojis((s) => !s)}
          className="text-neutral-400 hover:text-yellow-400 transition p-1"
          tabIndex={-1}
        >
          <Smile className="w-5 h-5" />
        </button>
        <button
          onClick={send}
          disabled={!value.trim() || disabled}
          className="text-green-400 hover:text-green-300 disabled:text-neutral-600 transition p-1"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
