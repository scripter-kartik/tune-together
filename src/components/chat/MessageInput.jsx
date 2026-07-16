"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Reply, Pencil, X } from "lucide-react";

const QUICK_EMOJIS = ["🔥", "💖", "🎵", "🤯", "😭", "👏", "😂", "❤️", "🙌", "✨"];

/**
 * Composer with optional reply / edit modes:
 *   replyTo: { senderName, text } | null   — banner above the input
 *   editing: { text } | null               — prefills the input
 * onCancelContext() clears whichever mode is active (also fired on Escape).
 */
export default function MessageInput({
  placeholder,
  onSend,
  onTyping,
  disabled,
  disabledHint,
  replyTo,
  editing,
  onCancelContext,
}) {
  const [value, setValue] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Entering edit mode prefills the original text; entering reply focuses.
  useEffect(() => {
    if (editing) setValue(editing.text || "");
    if (editing || replyTo) inputRef.current?.focus();
  }, [editing, replyTo]);

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

  const cancelContext = () => {
    if (editing) setValue("");
    onCancelContext?.();
  };

  return (
    <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:pb-4 pt-1 relative">
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 border-b-0 rounded-t-xl px-4 py-2 text-xs">
          {editing ? (
            <Pencil className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          ) : (
            <Reply className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {editing ? (
              <span className="text-neutral-400">Editing message</span>
            ) : (
              <>
                <span className="text-neutral-400">Replying to </span>
                <span className="text-neutral-200 font-semibold">{replyTo.senderName}</span>
                <span className="text-neutral-500 truncate"> — {replyTo.text}</span>
              </>
            )}
          </div>
          <button
            onClick={cancelContext}
            className="text-neutral-500 hover:text-white transition flex-shrink-0"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
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
      <div
        className={`flex items-center gap-2 bg-[#1e1e1e] border border-white/10 px-4 py-1 focus-within:border-green-500/50 transition ${
          replyTo || editing ? "rounded-b-xl" : "rounded-xl"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            } else if (e.key === "Escape" && (replyTo || editing)) {
              e.preventDefault();
              cancelContext();
            }
          }}
          maxLength={2000}
          disabled={disabled}
          placeholder={disabled ? disabledHint || "You can't send messages here" : placeholder}
          className="flex-1 bg-transparent py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none disabled:cursor-not-allowed"
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
