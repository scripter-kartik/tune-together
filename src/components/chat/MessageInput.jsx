"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Reply, Pencil, X, Music } from "lucide-react";
import SongPicker from "./SongPicker";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

const QUICK_EMOJIS = ["🔥", "💖", "🎵", "🤯", "😭", "👏", "😂", "❤️", "🙌", "✨"];

/**
 * Composer with optional reply / edit modes:
 *   replyTo: { senderName, text } | null   — banner above the input
 *   editing: { text } | null               — prefills the input
 * onCancelContext() clears whichever mode is active (also fired on Escape).
 *
 * Song sharing: the music button opens a SongPicker; a picked song becomes an
 * attachment chip and Send calls onSendSong(song, note) instead of onSend.
 * `nowPlaying` powers the picker's one-tap "share what's playing" row.
 */
export default function MessageInput({
  placeholder,
  onSend,
  onSendSong,
  nowPlaying,
  onTyping,
  disabled,
  disabledHint,
  replyTo,
  editing,
  onCancelContext,
}) {
  const [value, setValue] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [attachedSong, setAttachedSong] = useState(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Entering edit mode prefills the original text; entering reply focuses.
  useEffect(() => {
    if (editing) setValue(editing.text || "");
    if (editing || replyTo) {
      setAttachedSong(null);
      setShowPicker(false);
      inputRef.current?.focus();
    }
  }, [editing, replyTo]);

  const send = () => {
    const text = value.trim();
    if (disabled) return;
    if (attachedSong) {
      const song = attachedSong;
      setAttachedSong(null);
      setValue("");
      setShowEmojis(false);
      onSendSong?.(song, text);
      return;
    }
    if (!text) return;
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
      {showPicker && (
        <SongPicker
          nowPlaying={nowPlaying}
          onClose={() => setShowPicker(false)}
          onPick={(song) => {
            setShowPicker(false);
            setAttachedSong(song);
            inputRef.current?.focus();
          }}
        />
      )}

      {(replyTo || editing) && (
        <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] border-b-0 rounded-t-xl px-4 py-2 text-xs">
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

      {/* Attached song chip — Send will share this track */}
      {attachedSong && !editing && (
        <div className="flex items-center gap-2.5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] border-b-0 rounded-t-xl px-3 py-2">
          <img
            src={resolveCover(attachedSong.album?.cover_medium, attachedSong.title)}
            alt=""
            onError={coverError(attachedSong.title)}
            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-semibold truncate flex items-center gap-1.5">
              <Music className="w-3 h-3 text-green-400 flex-shrink-0" />
              {attachedSong.title}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">
              {attachedSong.artist?.name} · add a note or just hit send
            </p>
          </div>
          <button
            onClick={() => setAttachedSong(null)}
            className="text-neutral-500 hover:text-white transition flex-shrink-0"
            title="Remove song"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showEmojis && (
        <div className="absolute bottom-full right-6 mb-1 bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-2 flex gap-1 shadow-2xl z-10">
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
        className={`flex items-center gap-2 bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] shadow-lg px-4 py-1 focus-within:border-green-500/50 transition ${
          replyTo || editing || attachedSong ? "rounded-b-xl" : "rounded-xl"
        }`}
      >
        {onSendSong && !editing && (
          <button
            onClick={() => {
              setShowPicker((s) => !s);
              setShowEmojis(false);
            }}
            disabled={disabled}
            className={`transition p-1 -ml-1 ${
              showPicker || attachedSong
                ? "text-green-400"
                : "text-neutral-400 hover:text-green-400"
            } disabled:text-neutral-700`}
            title="Share a song"
            tabIndex={-1}
          >
            <Music className="w-5 h-5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            } else if (e.key === "Escape") {
              if (showPicker) {
                e.preventDefault();
                setShowPicker(false);
              } else if (attachedSong) {
                e.preventDefault();
                setAttachedSong(null);
              } else if (replyTo || editing) {
                e.preventDefault();
                cancelContext();
              }
            }
          }}
          maxLength={2000}
          disabled={disabled}
          placeholder={
            disabled
              ? disabledHint || "You can't send messages here"
              : attachedSong
                ? "Add a note (optional)…"
                : placeholder
          }
          className="flex-1 bg-transparent py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          onClick={() => {
            setShowEmojis((s) => !s);
            setShowPicker(false);
          }}
          className="text-neutral-400 hover:text-yellow-400 transition p-1"
          tabIndex={-1}
        >
          <Smile className="w-5 h-5" />
        </button>
        <button
          onClick={send}
          disabled={(!value.trim() && !attachedSong) || disabled}
          className="text-green-400 hover:text-green-300 disabled:text-neutral-600 transition p-1"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
