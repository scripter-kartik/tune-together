"use client";

import { useState } from "react";
import { Lock, Music, SmilePlus, Reply, Pencil, Trash2, Check, CheckCheck, Ban } from "lucide-react";

/**
 * Shared message list rendering for DM + group panes (Discord-style rows:
 * avatar, name, timestamp, grouped consecutive messages, day dividers) with
 * WhatsApp-style actions: react, reply, edit, delete-for-everyone.
 *
 * Messages: { id, senderId, senderName, senderImage, text, type, roomId,
 *             timestamp (Date), encrypted (bool), failed (bool),
 *             reactions [{emoji,userId}], replyToId, edited (bool),
 *             deleted (bool), delivered (bool) }
 *
 * Handlers (all optional — actions hide when absent):
 *   onReact(msg, emoji), onReply(msg), onEdit(msg), onDelete(msg)
 * `canDelete(msg)` decides delete visibility (e.g. group admins).
 * `showTicks` renders sent/delivered checks on own messages (DMs).
 */

const REACT_EMOJIS = ["❤️", "😂", "🔥", "🎵", "😮", "😭", "👍", "🙏"];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function groupReactions(reactions, myId) {
  const byEmoji = new Map();
  for (const r of reactions || []) {
    const cur = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    cur.count += 1;
    if (r.userId === myId) cur.mine = true;
    byEmoji.set(r.emoji, cur);
  }
  return [...byEmoji.values()];
}

export default function MessageList({
  messages,
  myId,
  onJoinSession,
  onReact,
  onReply,
  onEdit,
  onDelete,
  canDelete,
  showTicks,
}) {
  const [pickerFor, setPickerFor] = useState(null); // message id with open emoji picker

  // Resolve reply previews from the already-decrypted list.
  const byId = new Map(messages.map((m) => [String(m.id), m]));

  const rows = [];
  let prev = null;

  for (const msg of messages) {
    const showDivider = !prev || !sameDay(prev.timestamp, msg.timestamp);
    // Group consecutive messages from the same sender within 5 minutes.
    // Replies always show the full header so the quote block reads clearly.
    const grouped =
      !showDivider &&
      prev &&
      prev.senderId === msg.senderId &&
      prev.type === "text" &&
      msg.type === "text" &&
      !msg.replyToId &&
      msg.timestamp - prev.timestamp < 5 * 60 * 1000;

    if (showDivider) {
      rows.push(
        <div key={`div-${msg.id}`} className="flex items-center gap-3 my-4 px-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] font-semibold text-neutral-500">
            {dayLabel(msg.timestamp)}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      );
    }

    if (msg.type === "system") {
      rows.push(
        <div key={msg.id} className="px-4 py-1 text-center">
          <span className="text-xs text-neutral-500">{msg.text}</span>
        </div>
      );
    } else if (msg.type === "session-invite") {
      rows.push(
        <div key={msg.id} className="px-4 py-2">
          <div className="max-w-md mx-auto bg-gradient-to-r from-green-900/40 to-green-800/20 border border-green-700/40 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{msg.text}</p>
              <p className="text-xs text-neutral-400">Listen together in real time</p>
            </div>
            <button
              onClick={() => onJoinSession?.(msg.roomId)}
              className="bg-green-500 hover:bg-green-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition flex-shrink-0"
            >
              Join
            </button>
          </div>
        </div>
      );
    } else {
      const mine = msg.senderId === myId;
      const replyTarget = msg.replyToId ? byId.get(String(msg.replyToId)) : null;
      const reactions = groupReactions(msg.reactions, myId);
      const showActions = !msg.deleted && !msg.failed && (onReact || onReply || onEdit || onDelete);

      rows.push(
        <div
          key={msg.id}
          className={`group/msg relative px-4 hover:bg-white/[0.02] ${grouped ? "py-0.5" : "pt-3 pb-0.5"}`}
        >
          {/* Hover action bar */}
          {showActions && (
            <div className="absolute -top-3 right-4 z-10 hidden group-hover/msg:flex items-center bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl overflow-visible">
              {onReact && (
                <div className="relative">
                  <button
                    onClick={() => setPickerFor(pickerFor === msg.id ? null : msg.id)}
                    className="p-1.5 text-neutral-400 hover:text-yellow-400 transition"
                    title="React"
                  >
                    <SmilePlus className="w-4 h-4" />
                  </button>
                  {pickerFor === msg.id && (
                    <div className="absolute top-full right-0 mt-1 bg-[#1e1e1e] border border-white/10 rounded-xl p-1.5 flex gap-0.5 shadow-2xl z-20">
                      {REACT_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setPickerFor(null);
                            onReact(msg, e);
                          }}
                          className="text-lg hover:scale-125 transition-transform p-0.5"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {onReply && (
                <button
                  onClick={() => onReply(msg)}
                  className="p-1.5 text-neutral-400 hover:text-white transition"
                  title="Reply"
                >
                  <Reply className="w-4 h-4" />
                </button>
              )}
              {onEdit && mine && msg.encrypted && (
                <button
                  onClick={() => onEdit(msg)}
                  className="p-1.5 text-neutral-400 hover:text-white transition"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (canDelete ? canDelete(msg) : mine) && (
                <button
                  onClick={() => onDelete(msg)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 transition"
                  title="Delete for everyone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-10 flex-shrink-0">
              {!grouped &&
                (msg.senderImage ? (
                  <img
                    src={msg.senderImage}
                    alt={msg.senderName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                    {msg.senderName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                ))}
            </div>
            <div className="flex-1 min-w-0">
              {!grouped && (
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm font-semibold ${mine ? "text-green-400" : "text-white"}`}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.encrypted && !msg.deleted && (
                    <Lock className="w-3 h-3 text-neutral-600" title="End-to-end encrypted" />
                  )}
                </div>
              )}

              {/* Quoted reply preview */}
              {msg.replyToId && !msg.deleted && (
                <div className="mt-0.5 mb-1 pl-2 border-l-2 border-green-500/50 text-xs text-neutral-400 truncate">
                  <span className="font-semibold text-neutral-300">
                    {replyTarget ? replyTarget.senderName : "Message"}
                  </span>{" "}
                  {replyTarget
                    ? replyTarget.deleted
                      ? "— deleted message"
                      : replyTarget.failed
                        ? "— 🔒 can't decrypt"
                        : `— ${replyTarget.text.slice(0, 80)}`
                    : "— unavailable"}
                </div>
              )}

              {msg.deleted ? (
                <p className="text-sm text-neutral-500 italic flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" /> This message was deleted
                </p>
              ) : msg.failed ? (
                <p className="text-sm text-neutral-500 italic">
                  🔒 Can't decrypt — sent to another device's keys
                </p>
              ) : (
                <p className="text-sm text-neutral-200 break-words whitespace-pre-wrap">
                  {msg.text}
                  {msg.edited && (
                    <span className="text-[10px] text-neutral-500 ml-1.5">(edited)</span>
                  )}
                  {showTicks && mine && (
                    <span
                      className="inline-flex ml-1.5 align-middle"
                      title={msg.delivered ? "Delivered" : "Sent"}
                    >
                      {msg.delivered ? (
                        <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </span>
                  )}
                </p>
              )}

              {/* Reaction pills */}
              {reactions.length > 0 && !msg.deleted && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => onReact?.(msg, r.emoji)}
                      className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition ${
                        r.mine
                          ? "bg-green-500/20 border-green-500/50 text-green-300"
                          : "bg-white/5 border-white/10 text-neutral-300 hover:border-white/30"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-semibold">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    prev = msg;
  }

  return <>{rows}</>;
}
