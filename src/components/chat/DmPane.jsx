"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Ban, MessageCircle, Menu } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { encryptDmTo, decryptDmRow } from "@/lib/e2eeClient";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

/**
 * A 1:1 E2EE DM thread. `friend` is a public profile { clerkId, name,
 * username, imageUrl }. `me` is the Clerk user object.
 */
export default function DmPane({ me, friend, onJoinSession, onBlock, onBack, backBadge = 0 }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [peerHasKeys, setPeerHasKeys] = useState(true);
  const [error, setError] = useState(null);
  const [replyTo, setReplyTo] = useState(null); // ui message being replied to
  const [editing, setEditing] = useState(null); // ui message being edited
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const toUiMessage = useCallback(
    async (row) => {
      const otherId = friend.clerkId;
      const deleted = !!row.deletedForEveryone;
      const text = deleted ? "" : await decryptDmRow(me.id, otherId, row);
      return {
        id: row._id || row.messageId || `${row.senderId}-${+new Date(row.createdAt || row.timestamp)}`,
        senderId: row.senderId,
        senderName: row.senderId === me.id ? me.fullName || "You" : row.senderName,
        senderImage: row.senderId === me.id ? me.imageUrl : row.senderImage,
        text: text ?? "",
        failed: !deleted && text === null,
        encrypted: !!row.ciphertext,
        type: "text",
        replyToId: row.replyToId || null,
        reactions: row.reactions || [],
        edited: !!row.edited,
        deleted,
        delivered: !!row.delivered || !!row.read,
        timestamp: new Date(row.createdAt || row.timestamp || Date.now()),
      };
    },
    [me.id, me.fullName, me.imageUrl, friend.clerkId]
  );

  // Load history + subscribe to live messages.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReplyTo(null);
    setEditing(null);

    (async () => {
      try {
        const res = await fetch(`/api/chat/history?userId=${friend.clerkId}`);
        const data = await res.json();
        const ui = await Promise.all((data.messages || []).map(toUiMessage));
        if (!cancelled) {
          setMessages(ui);
          scrollToBottom();
        }
      } catch (e) {
        console.error("Error loading DM history:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const socket = getSocket();
    socketRef.current = socket;

    const onReceive = async (data) => {
      if (data.senderId !== friend.clerkId) return;
      const ui = await toUiMessage(data);
      setMessages((prev) => [...prev, ui]);
      socket.emit("mark-read", { senderId: friend.clerkId });
      scrollToBottom();
    };
    const onTyping = (data) => {
      if (data.senderId !== friend.clerkId) return;
      setTyping(data.isTyping);
      if (data.isTyping) setTimeout(() => setTyping(false), 3000);
    };
    // Single → double tick: our message reached the peer's device.
    const onDelivered = ({ recipientId, messageId }) => {
      if (recipientId !== friend.clerkId || !messageId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, delivered: true } : m))
      );
    };
    // Peer reacted / edited / deleted a message; re-render that row.
    const onUpdated = async ({ senderId, message }) => {
      if (senderId !== friend.clerkId || !message?._id) return;
      const ui = await toUiMessage(message);
      setMessages((prev) => prev.map((m) => (m.id === message._id ? ui : m)));
    };

    socket.on("receive-dm", onReceive);
    socket.on("user-typing", onTyping);
    socket.on("dm-delivered", onDelivered);
    socket.on("dm-message-updated", onUpdated);
    return () => {
      cancelled = true;
      socket.off("receive-dm", onReceive);
      socket.off("user-typing", onTyping);
      socket.off("dm-delivered", onDelivered);
      socket.off("dm-message-updated", onUpdated);
    };
  }, [friend.clerkId, toUiMessage]);

  const sendMessage = async (text) => {
    setError(null);

    // Edit mode: PATCH the existing message instead of creating a new one.
    if (editing) {
      const target = editing;
      setEditing(null);
      await patchMessage(target, "edit", { text });
      return;
    }

    const reply = replyTo;
    setReplyTo(null);

    try {
      const encrypted = await encryptDmTo(me.id, friend.clerkId, text);
      if (!encrypted) {
        setPeerHasKeys(false);
        setError(`${friend.name} hasn't opened the new chat yet — they need to sign in once before you can message them securely.`);
        return;
      }

      // Optimistic append (we know our own plaintext).
      const tmpId = `tmp-${Date.now()}-${text.length}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tmpId,
          senderId: me.id,
          senderName: me.fullName || "You",
          senderImage: me.imageUrl,
          text,
          encrypted: true,
          type: "text",
          replyToId: reply?.id || null,
          reactions: [],
          timestamp: new Date(),
        },
      ]);
      scrollToBottom();

      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: friend.clerkId,
          ...encrypted,
          replyToId: reply?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
        setMessages((prev) => prev.filter((m) => m.id !== tmpId));
        return;
      }

      // Swap the temp id for the real one so actions/ticks target it.
      const realId = data.message?._id;
      if (realId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tmpId ? { ...m, id: realId, replyToId: data.message.replyToId || null } : m
          )
        );
      }

      socketRef.current?.emit("send-dm", {
        recipientId: friend.clerkId,
        ...encrypted,
        replyToId: data.message?.replyToId || null,
        messageId: realId,
        senderName: me.fullName || "User",
        senderImage: me.imageUrl,
      });
    } catch (e) {
      console.error("Error sending DM:", e);
      setError("Failed to send message");
    }
  };

  // Shared PATCH runner for react / edit / delete, then sync peer via socket.
  const patchMessage = async (msg, action, extra = {}) => {
    try {
      const body = { action };
      if (action === "react") body.emoji = extra.emoji;
      if (action === "edit") {
        const encrypted = await encryptDmTo(me.id, friend.clerkId, extra.text);
        if (!encrypted) return;
        body.ciphertext = encrypted.ciphertext;
        body.iv = encrypted.iv;
      }

      const res = await fetch(`/api/chat/message/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }

      // Locally we keep our plaintext for edits (row ciphertext is for the peer).
      const row = data.message;
      const patched = {
        replyToId: row.replyToId || null,
        reactions: row.reactions || [],
        edited: !!row.edited,
        deleted: !!row.deletedForEveryone,
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                ...patched,
                text: action === "edit" ? extra.text : action === "delete" ? "" : m.text,
              }
            : m
        )
      );

      socketRef.current?.emit("dm-message-updated", {
        recipientId: friend.clerkId,
        message: row,
      });
    } catch (e) {
      console.error(`Error on DM ${action}:`, e);
      setError("Action failed");
    }
  };

  const emitTyping = (isTyping) =>
    socketRef.current?.emit("typing", { recipientId: friend.clerkId, isTyping });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent">
      {/* Header */}
      <div className="h-14 flex-shrink-0 border-b border-white/[0.05] bg-white/[0.02] backdrop-blur-xl flex items-center px-4 gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden relative p-1.5 -ml-2 text-neutral-400 hover:text-white rounded-lg active:bg-white/10 transition"
            title="All chats"
          >
            <Menu className="w-5 h-5" />
            {backBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-black text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                {backBadge > 99 ? "99+" : backBadge}
              </span>
            )}
          </button>
        )}
        {friend.imageUrl ? (
          <img src={friend.imageUrl} alt={friend.name} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold">
            {friend.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-sm truncate">{friend.name}</h2>
          {typing ? (
            <p className="text-xs text-green-400 italic">typing…</p>
          ) : (
            friend.username && <p className="text-xs text-neutral-500">@{friend.username}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-neutral-600" title="Messages are end-to-end encrypted">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:block">End-to-end encrypted</span>
          </div>
          {onBlock && (
            <button
              onClick={onBlock}
              className="p-2 rounded-lg text-neutral-500 hover:text-red-400 transition"
              title={`Block ${friend.name}`}
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-neutral-300 font-medium">This is the beginning of your chat with {friend.name}</p>
            <p className="text-neutral-500 text-xs mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Messages are end-to-end encrypted
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            myId={me.id}
            onJoinSession={onJoinSession}
            showTicks
            onReact={(msg, emoji) => patchMessage(msg, "react", { emoji })}
            onReply={(msg) => {
              setEditing(null);
              setReplyTo(msg);
            }}
            onEdit={(msg) => {
              setReplyTo(null);
              setEditing(msg);
            }}
            onDelete={(msg) => patchMessage(msg, "delete")}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-1 px-3 py-2 bg-red-900/30 border border-red-800/40 rounded-lg flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <MessageInput
        placeholder={`Message ${friend.name}`}
        onSend={sendMessage}
        onTyping={emitTyping}
        disabled={!peerHasKeys}
        disabledHint={`${friend.name} hasn't set up secure chat yet`}
        replyTo={replyTo ? { senderName: replyTo.senderName, text: replyTo.text.slice(0, 60) } : null}
        editing={editing ? { text: editing.text } : null}
        onCancelContext={() => {
          setReplyTo(null);
          setEditing(null);
        }}
      />
    </div>
  );
}
