"use client";

import { Lock, Music } from "lucide-react";

/**
 * Shared message list rendering for DM + group panes (Discord-style rows:
 * avatar, name, timestamp, grouped consecutive messages, day dividers).
 * Messages: { id, senderId, senderName, senderImage, text, type, roomId,
 *             timestamp (Date), encrypted (bool), failed (bool) }
 */

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

export default function MessageList({ messages, myId, onJoinSession }) {
  const rows = [];
  let prev = null;

  for (const msg of messages) {
    const showDivider = !prev || !sameDay(prev.timestamp, msg.timestamp);
    // Group consecutive messages from the same sender within 5 minutes.
    const grouped =
      !showDivider &&
      prev &&
      prev.senderId === msg.senderId &&
      prev.type === "text" &&
      msg.type === "text" &&
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
      rows.push(
        <div
          key={msg.id}
          className={`px-4 hover:bg-white/[0.02] ${grouped ? "py-0.5" : "pt-3 pb-0.5"}`}
        >
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
                    className={`text-sm font-semibold ${
                      msg.senderId === myId ? "text-green-400" : "text-white"
                    }`}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.encrypted && (
                    <Lock className="w-3 h-3 text-neutral-600" title="End-to-end encrypted" />
                  )}
                </div>
              )}
              {msg.failed ? (
                <p className="text-sm text-neutral-500 italic">
                  🔒 Can't decrypt — sent to another device's keys
                </p>
              ) : (
                <p className="text-sm text-neutral-200 break-words whitespace-pre-wrap">
                  {msg.text}
                </p>
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
