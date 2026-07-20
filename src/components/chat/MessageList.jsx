"use client";

import { useState, useRef } from "react";
import {
  Lock,
  Music,
  SmilePlus,
  Reply,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  Ban,
  Copy,
  Play,
  Plus,
  Radio,
} from "lucide-react";
import { resolveCover, coverError } from "@/lib/coverPlaceholder";

/**
 * iOS-style bubble message list shared by DM + group panes.
 * Mine: right-aligned green bubbles. Theirs: left-aligned dark bubbles.
 * Timestamps + ticks live inside the bubble (bottom-right, WhatsApp style);
 * consecutive messages cluster with tightened inner corners.
 *
 * Desktop: hover action bar. Mobile: long-press opens a floating action
 * sheet, swipe-right on a bubble replies to it.
 *
 * Messages: { id, senderId, senderName, senderImage, text, type, roomId,
 *             timestamp (Date), encrypted (bool), failed (bool),
 *             reactions [{emoji,userId}], replyToId, edited (bool),
 *             deleted (bool), delivered (bool) }
 *
 * `isGroup` shows sender names + avatars on incoming bubbles.
 * `canDelete(msg)` decides delete visibility (e.g. group admins).
 * `showTicks` renders sent/delivered checks on own messages (DMs).
 */

const REACT_EMOJIS = ["❤️", "😂", "🔥", "🎵", "😮", "😭", "👍", "🙏"];

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_PX = 56; // drag distance that commits a reply
const SWIPE_MAX_PX = 72;

// Stable per-sender name colors for group chats.
const NAME_COLORS = [
  "text-emerald-400",
  "text-sky-400",
  "text-violet-400",
  "text-orange-400",
  "text-pink-400",
  "text-amber-400",
  "text-cyan-400",
  "text-rose-400",
];

function nameColorOf(senderId) {
  let h = 0;
  for (let i = 0; i < (senderId || "").length; i++) h = (h * 31 + senderId.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

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

function timeLabel(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(s) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
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

// Two text messages cluster when same sender, close in time, and the newer
// one isn't a reply (replies always show their quote block on a fresh bubble).
function clusters(a, b) {
  return (
    a &&
    b &&
    a.type === "text" &&
    b.type === "text" &&
    a.senderId === b.senderId &&
    sameDay(a.timestamp, b.timestamp) &&
    !b.replyToId &&
    b.timestamp - a.timestamp < 5 * 60 * 1000
  );
}

/** One bubble row: hover bar (desktop) + long-press/swipe (mobile). */
function MessageRow({
  msg,
  mine,
  isGroup,
  groupedPrev,
  groupedNext,
  replyTarget,
  handlers,
  showTicks,
  pickerOpen,
  onTogglePicker,
  onOpenSheet,
  onPlaySong,
  onQueueSong,
  onSyncSong,
}) {
  const { onReact, onReply, onEdit, onDelete, allowEdit, allowDelete } = handlers;
  const reactions = groupReactions(msg.reactions, handlers.myId);
  const actionable = !msg.deleted && !msg.failed && (onReact || onReply || onEdit || onDelete);

  // Song messages can't be edited (the envelope format prevents partial edits).
  const isSong = !!msg.song;
  const canEdit = allowEdit && !isSong;

  // ── Touch gestures: long-press → sheet, horizontal drag → reply ──
  const [dragX, setDragX] = useState(0);
  const touchRef = useRef(null); // { x, y, timer, swiping, fired }

  const clearTouch = () => {
    if (touchRef.current?.timer) clearTimeout(touchRef.current.timer);
    touchRef.current = null;
    setDragX(0);
  };

  const onTouchStart = (e) => {
    if (!actionable) return;
    const t = e.touches[0];
    touchRef.current = {
      x: t.clientX,
      y: t.clientY,
      swiping: false,
      fired: false,
      timer: setTimeout(() => {
        // Long press — only if the finger hasn't wandered into a swipe/scroll.
        if (touchRef.current && !touchRef.current.swiping) {
          touchRef.current.fired = true;
          navigator.vibrate?.(12);
          onOpenSheet(msg);
        }
      }, LONG_PRESS_MS),
    };
  };

  const onTouchMove = (e) => {
    const s = touchRef.current;
    if (!s || s.fired) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;

    if (!s.swiping) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll — abandon both gestures.
        clearTouch();
        return;
      }
      if (dx > 14 && onReply) {
        s.swiping = true;
        clearTimeout(s.timer);
      } else if (Math.abs(dx) > 14) {
        clearTimeout(s.timer); // left drag: not a long press, not a reply
      }
    }
    if (s.swiping) setDragX(Math.min(Math.max(dx, 0), SWIPE_MAX_PX));
  };

  const onTouchEnd = () => {
    const s = touchRef.current;
    if (s?.swiping && dragX >= SWIPE_REPLY_PX) {
      navigator.vibrate?.(8);
      onReply(msg);
    }
    clearTouch();
  };

  // ── Bubble shape: 20px corners, 6px on cluster-inner corners ──
  const shape = mine
    ? `rounded-[20px] ${groupedPrev ? "rounded-tr-[6px]" : ""} ${groupedNext ? "rounded-br-[6px]" : ""}`
    : `rounded-[20px] ${groupedPrev ? "rounded-tl-[6px]" : ""} ${groupedNext ? "rounded-bl-[6px]" : ""}`;

  const isMediaOnly = (msg.gif || msg.sticker) && !msg.deleted && !msg.failed;
  const skin = msg.deleted
    ? "bg-transparent border border-white/10 text-neutral-500"
    : msg.sticker && !msg.failed
      ? "bg-transparent text-white"
      : mine
        ? "bg-green-500/80 backdrop-blur-xl border border-green-400/30 text-white shadow-md"
        : "bg-white/[0.08] backdrop-blur-xl border border-white/[0.05] text-neutral-100 shadow-md";

  // Invisible trailing spacer reserves room for the in-bubble meta row.
  const metaWidth =
    52 + (msg.edited ? 38 : 0) + (showTicks && mine && !msg.deleted ? 20 : 0);

  const showName = isGroup && !mine && !groupedPrev && msg.senderName;
  const showAvatar = isGroup && !mine;

  return (
    <div
      className={`group/msg relative px-3 ${groupedPrev ? "mt-[3px]" : "mt-3"} [@media(hover:none)]:select-none [@media(hover:none)]:[-webkit-touch-callout:none]`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={clearTouch}
      onContextMenu={(e) => {
        // Long-press on touch devices fires contextmenu — the sheet replaces it.
        if (touchRef.current || dragX) e.preventDefault();
      }}
    >
      {/* Swipe-to-reply affordance */}
      {dragX > 0 && (
        <div
          className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-green-500/20 transition-opacity"
          style={{ opacity: Math.min(dragX / SWIPE_REPLY_PX, 1) }}
        >
          <Reply className="w-4 h-4 text-green-400" />
        </div>
      )}

      {/* Hover action bar (desktop / pointer devices only) */}
      {actionable && (
        <div
          className={`absolute -top-3.5 z-20 hidden [@media(hover:hover)]:group-hover/msg:flex items-center bg-black/40 backdrop-blur-xl border border-white/[0.1] rounded-full shadow-xl px-0.5 ${
            mine ? "right-3" : showAvatar ? "left-12" : "left-3"
          }`}
        >
          {onReact && (
            <div className="relative">
              <button
                onClick={() => onTogglePicker(msg.id)}
                className="p-1.5 text-neutral-400 hover:text-yellow-400 transition"
                title="React"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              {pickerOpen && (
                <div
                  className={`absolute top-full mt-1.5 bg-black/60 backdrop-blur-2xl border border-white/[0.1] rounded-full p-1.5 flex gap-0.5 shadow-2xl z-30 ${
                    mine ? "right-0" : "left-0"
                  }`}
                >
                  {REACT_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        onTogglePicker(null);
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
          {canEdit && (
            <button
              onClick={() => onEdit(msg)}
              className="p-1.5 text-neutral-400 hover:text-white transition"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {allowDelete && (
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

      <div
        className={`relative flex ${mine ? "justify-end" : "justify-start"} ${showAvatar ? "pl-10" : ""} transition-transform duration-75`}
        style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
      >
        {/* Avatar on the last bubble of an incoming cluster (groups) */}
        {showAvatar && !groupedNext && (
          <div className="absolute left-0 bottom-0">
            {msg.senderImage ? (
              <img src={msg.senderImage} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                {msg.senderName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col max-w-[80%] sm:max-w-[65%] ${mine ? "items-end" : "items-start"}`}>
          {showName && (
            <span className={`text-[11px] font-semibold mb-0.5 px-3 ${nameColorOf(msg.senderId)}`}>
              {msg.senderName}
            </span>
          )}

          <div className={`relative ${isMediaOnly && !msg.sticker ? 'p-1' : 'px-3 py-1.5'} ${shape} ${skin}`}>
            {/* Quoted reply preview */}
            {msg.replyToId && !msg.deleted && (
              <div
                className={`mt-1 mb-1.5 px-2.5 py-1.5 rounded-xl border-l-2 text-xs ${
                  mine
                    ? "bg-black/20 border-white/50"
                    : "bg-white/[0.06] border-green-500/70"
                }`}
              >
                <p className={`font-semibold truncate ${mine ? "text-white/90" : "text-green-400"}`}>
                  {replyTarget ? replyTarget.senderName : "Message"}
                </p>
                <p className={`truncate ${mine ? "text-white/60" : "text-neutral-400"}`}>
                  {replyTarget
                    ? replyTarget.deleted
                      ? "deleted message"
                      : replyTarget.failed
                        ? "🔒 can't decrypt"
                        : replyTarget.text.slice(0, 90)
                    : "unavailable"}
                </p>
              </div>
            )}

            {msg.deleted ? (
              <p className="text-[13.5px] italic flex items-center gap-1.5 py-0.5">
                <Ban className="w-3.5 h-3.5" /> This message was deleted
              </p>
            ) : msg.failed ? (
              <p className="text-[13.5px] italic text-neutral-400 py-0.5">
                🔒 Can't decrypt — sent to another device's keys
              </p>
            ) : msg.song ? (
              /* ── Song card bubble ── */
              <div className="flex flex-col gap-2 py-1 min-w-[220px] max-w-[280px]">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-900/50">
                    <img
                      src={resolveCover(msg.song.album?.cover_medium, msg.song.title)}
                      alt=""
                      onError={coverError(msg.song.title)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight truncate ${mine ? "text-white" : "text-white"}`}>
                      {msg.song.title}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${mine ? "text-white/70" : "text-neutral-400"}`}>
                      {msg.song.artist?.name}
                      {msg.song.duration ? ` · ${fmtDuration(msg.song.duration)}` : ""}
                    </p>
                  </div>
                </div>
                {msg.text && (
                  <p className={`text-[13.5px] leading-snug ${mine ? "text-white/90" : "text-neutral-200"}`}>
                    {msg.text}
                  </p>
                )}
                {/* Action buttons: Play + Queue + Sync */}
                {(onPlaySong || onQueueSong || onSyncSong) && (
                  <div className="flex gap-2 mt-1">
                    {onPlaySong && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(msg.song);
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-xs transition ${
                          mine
                            ? "bg-white/20 hover:bg-white/30 text-white"
                            : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play
                      </button>
                    )}
                    {onQueueSong && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQueueSong(msg.song);
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-xs transition ${
                          mine
                            ? "bg-white/10 hover:bg-white/20 text-white/80"
                            : "bg-white/[0.08] hover:bg-white/[0.12] text-neutral-300"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Queue
                      </button>
                    )}
                    {onSyncSong && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSyncSong(msg.song);
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-xs transition ${
                          mine
                            ? "bg-black/20 hover:bg-black/30 text-white"
                            : "bg-green-500 text-black hover:bg-green-400"
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Sync
                      </button>
                    )}
                  </div>
                )}
                {/* In-bubble meta: time · ticks */}
                <span
                  className={`self-end flex items-center gap-1 text-[10px] leading-none mt-0.5 ${
                    mine ? "text-white/60" : "text-neutral-500"
                  }`}
                >
                  <span>{timeLabel(msg.timestamp)}</span>
                  {showTicks &&
                    mine &&
                    (msg.delivered ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#9ff0c0]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white/60" />
                    ))}
                </span>
              </div>
            ) : msg.gif ? (
              /* ── GIF Bubble ── */
              <div className="flex flex-col relative min-w-[120px] min-h-[120px]">
                <img src={msg.gif} alt="GIF" className="w-full max-w-[260px] rounded-xl object-contain" />
                <span
                  className={`absolute bottom-1 right-1.5 bg-black/40 backdrop-blur-sm rounded px-1 flex items-center gap-1 text-[10px] leading-none py-0.5 text-white/90 shadow-sm`}
                >
                  <span>{timeLabel(msg.timestamp)}</span>
                  {showTicks &&
                    mine &&
                    (msg.delivered ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#9ff0c0]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white/60" />
                    ))}
                </span>
              </div>
            ) : msg.sticker ? (
              /* ── Sticker Bubble ── */
              <div className="flex flex-col relative">
                <img src={msg.sticker} alt="Sticker" className="w-36 h-36 object-contain drop-shadow-xl" />
                <span
                  className={`absolute bottom-1 right-1.5 bg-black/40 backdrop-blur-sm rounded px-1 flex items-center gap-1 text-[10px] leading-none py-0.5 text-white/90 shadow-sm`}
                >
                  <span>{timeLabel(msg.timestamp)}</span>
                  {showTicks &&
                    mine &&
                    (msg.delivered ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#9ff0c0]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white/60" />
                    ))}
                </span>
              </div>
            ) : (
              <>
                <p className="text-[15px] leading-[1.35] break-words whitespace-pre-wrap">
                  {msg.text}
                  <span
                    className="inline-block h-px align-middle"
                    style={{ width: metaWidth }}
                  />
                </p>
                {/* In-bubble meta: edited · time · ticks */}
                <span
                  className={`absolute bottom-[5px] right-2.5 flex items-center gap-1 text-[10px] leading-none ${
                    mine ? "text-white/60" : "text-neutral-500"
                  }`}
                >
                  {msg.edited && <span>edited</span>}
                  <span>{timeLabel(msg.timestamp)}</span>
                  {showTicks &&
                    mine &&
                    (msg.delivered ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#9ff0c0]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white/60" />
                    ))}
                </span>
              </>
            )}
          </div>

          {/* Reaction pills, tucked under the bubble edge */}
          {reactions.length > 0 && !msg.deleted && (
            <div className={`flex flex-wrap gap-1 -mt-1.5 z-10 ${mine ? "pr-2" : "pl-2"}`}>
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(msg, r.emoji)}
                  className={`flex items-center gap-1 text-[11px] px-1.5 py-[3px] rounded-full border shadow-md transition ${
                    r.mine
                      ? "bg-green-900/60 backdrop-blur-md border-green-500/60 text-green-300"
                      : "bg-black/40 backdrop-blur-md border-white/10 text-neutral-300 hover:border-white/30"
                  }`}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="font-semibold">{r.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** iOS-style floating action sheet for touch devices. */
function ActionSheet({ msg, myReaction, handlers, onClose, onPlaySong, onQueueSong, onSyncSong }) {
  const { onReact, onReply, onEdit, onDelete, allowEdit, allowDelete } = handlers;

  const act = (fn) => {
    onClose();
    fn();
  };

  const isSong = !!msg.song;
  const canEdit = allowEdit && !isSong;

  const Row = ({ icon: Icon, label, danger, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-3.5 text-[15px] active:bg-white/5 transition ${
        danger ? "text-red-400" : "text-neutral-100"
      }`}
    >
      {label}
      <Icon className={`w-5 h-5 ${danger ? "" : "text-neutral-400"}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end p-2.5 pb-[max(env(safe-area-inset-bottom),10px)]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Reaction bar — floats above the sheet, iMessage style */}
        {onReact && (
          <div className="mb-2 mx-auto w-fit max-w-full bg-white/[0.05] backdrop-blur-3xl border border-white/[0.1] rounded-full px-2 py-1.5 flex gap-0.5 shadow-2xl overflow-x-auto">
            {REACT_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => act(() => onReact(msg, e))}
                className={`text-[24px] leading-none p-1.5 rounded-full active:scale-90 transition-transform ${
                  myReaction === e ? "bg-green-500/25 ring-1 ring-green-500/50" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white/[0.05] backdrop-blur-3xl border border-white/[0.1] rounded-[22px] overflow-hidden shadow-2xl">
          {/* Quoted message being acted on */}
          <div className="px-5 pt-3.5 pb-3 border-b border-white/[0.07]">
            <p className="text-xs font-semibold text-green-400">{msg.senderName}</p>
            <p className="text-[13px] text-neutral-400 truncate mt-0.5">{msg.text || "…"}</p>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {onReply && <Row icon={Reply} label="Reply" onClick={() => act(() => onReply(msg))} />}
            {isSong && onPlaySong && (
              <Row icon={Play} label="Play" onClick={() => act(() => onPlaySong(msg.song))} />
            )}
            {isSong && onQueueSong && (
              <Row icon={Plus} label="Add to Queue" onClick={() => act(() => onQueueSong(msg.song))} />
            )}
            {isSong && onSyncSong && (
              <Row icon={Radio} label="Sync with Friend" onClick={() => act(() => onSyncSong(msg.song))} />
            )}
            {msg.text && !msg.deleted && (
              <Row
                icon={Copy}
                label="Copy"
                onClick={() => act(() => navigator.clipboard?.writeText(msg.text))}
              />
            )}
            {canEdit && <Row icon={Pencil} label="Edit" onClick={() => act(() => onEdit(msg))} />}
            {allowDelete && (
              <Row
                icon={Trash2}
                label="Delete for everyone"
                danger
                onClick={() => act(() => onDelete(msg))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  myId,
  isGroup,
  onJoinSession,
  onReact,
  onReply,
  onEdit,
  onDelete,
  canDelete,
  showTicks,
  onPlaySong,
  onQueueSong,
  onSyncSong,
}) {
  const [pickerFor, setPickerFor] = useState(null); // message id with open desktop picker
  const [sheetMsg, setSheetMsg] = useState(null); // message with open mobile sheet

  // Resolve reply previews from the already-decrypted list.
  const byId = new Map(messages.map((m) => [String(m.id), m]));

  const handlersFor = (msg) => {
    const mine = msg.senderId === myId;
    return {
      myId,
      onReact,
      onReply,
      onEdit,
      onDelete,
      allowEdit: !!onEdit && mine && msg.encrypted && !msg.deleted,
      allowDelete: !!onDelete && (canDelete ? canDelete(msg) : mine) && !msg.deleted,
    };
  };

  const rows = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1] || null;
    const next = messages[i + 1] || null;
    const showDivider = !prev || !sameDay(prev.timestamp, msg.timestamp);

    if (showDivider) {
      rows.push(
        <div key={`div-${msg.id}`} className="flex justify-center my-4">
          <span className="text-[11px] font-semibold text-neutral-300 bg-black/40 backdrop-blur-md border border-white/[0.1] px-3.5 py-1 rounded-full shadow-sm">
            {dayLabel(msg.timestamp)}
          </span>
        </div>
      );
    }

    if (msg.type === "system") {
      rows.push(
        <div key={msg.id} className="flex justify-center py-1.5 px-6">
          <span className="text-[11.5px] text-neutral-500 bg-white/[0.04] px-3 py-1 rounded-full text-center">
            {msg.text}
          </span>
        </div>
      );
    } else if (msg.type === "session-invite") {
      rows.push(
        <div key={msg.id} className="px-4 py-2">
          <div className="max-w-sm mx-auto bg-gradient-to-b from-[#123524] to-[#0d2a1c] border border-green-500/25 rounded-[20px] p-4 flex items-center gap-3 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold truncate">{msg.text}</p>
              <p className="text-xs text-neutral-400 mt-0.5">Listen together in real time</p>
            </div>
            <button
              onClick={() => onJoinSession?.(msg.roomId)}
              className="bg-green-500 hover:bg-green-400 active:scale-95 text-black text-sm font-bold px-4 py-2 rounded-full transition flex-shrink-0"
            >
              Join
            </button>
          </div>
        </div>
      );
    } else {
      rows.push(
        <MessageRow
          key={msg.id}
          msg={msg}
          mine={msg.senderId === myId}
          isGroup={!!isGroup}
          groupedPrev={!showDivider && clusters(prev, msg)}
          groupedNext={next ? sameDay(msg.timestamp, next.timestamp) && clusters(msg, next) : false}
          replyTarget={msg.replyToId ? byId.get(String(msg.replyToId)) : null}
          handlers={handlersFor(msg)}
          showTicks={showTicks}
          pickerOpen={pickerFor === msg.id}
          onTogglePicker={(id) => setPickerFor((cur) => (cur === id ? null : id))}
          onOpenSheet={setSheetMsg}
          onPlaySong={onPlaySong}
          onQueueSong={onQueueSong}
          onSyncSong={onSyncSong}
        />
      );
    }
  }

  return (
    <>
      {rows}
      {sheetMsg && (
        <ActionSheet
          msg={sheetMsg}
          myReaction={sheetMsg.reactions?.find((r) => r.userId === myId)?.emoji}
          handlers={handlersFor(sheetMsg)}
          onClose={() => setSheetMsg(null)}
          onPlaySong={onPlaySong}
          onQueueSong={onQueueSong}
          onSyncSong={onSyncSong}
        />
      )}
    </>
  );
}
