"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Ban, MessageCircle } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { encryptDmTo, decryptDmRow } from "@/lib/e2eeClient";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

/**
 * A 1:1 E2EE DM thread. `friend` is a public profile { clerkId, name,
 * username, imageUrl }. `me` is the Clerk user object.
 */
export default function DmPane({ me, friend, onJoinSession, onBlock }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [peerHasKeys, setPeerHasKeys] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const toUiMessage = useCallback(
    async (row) => {
      const otherId = friend.clerkId;
      const text = await decryptDmRow(me.id, otherId, row);
      return {
        id: row._id || `${row.senderId}-${+new Date(row.createdAt || row.timestamp)}`,
        senderId: row.senderId,
        senderName: row.senderId === me.id ? me.fullName || "You" : row.senderName,
        senderImage: row.senderId === me.id ? me.imageUrl : row.senderImage,
        text: text ?? "",
        failed: text === null,
        encrypted: !!row.ciphertext,
        type: "text",
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

    socket.on("receive-dm", onReceive);
    socket.on("user-typing", onTyping);
    return () => {
      cancelled = true;
      socket.off("receive-dm", onReceive);
      socket.off("user-typing", onTyping);
    };
  }, [friend.clerkId, toUiMessage]);

  const sendMessage = async (text) => {
    setError(null);
    try {
      const encrypted = await encryptDmTo(me.id, friend.clerkId, text);
      if (!encrypted) {
        setPeerHasKeys(false);
        setError(`${friend.name} hasn't opened the new chat yet — they need to sign in once before you can message them securely.`);
        return;
      }

      // Optimistic append (we know our own plaintext).
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-${prev.length}-${text.length}`,
          senderId: me.id,
          senderName: me.fullName || "You",
          senderImage: me.imageUrl,
          text,
          encrypted: true,
          type: "text",
          timestamp: new Date(),
        },
      ]);
      scrollToBottom();

      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: friend.clerkId, ...encrypted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
        return;
      }

      socketRef.current?.emit("send-dm", {
        recipientId: friend.clerkId,
        ...encrypted,
        senderName: me.fullName || "User",
        senderImage: me.imageUrl,
      });
    } catch (e) {
      console.error("Error sending DM:", e);
      setError("Failed to send message");
    }
  };

  const emitTyping = (isTyping) =>
    socketRef.current?.emit("typing", { recipientId: friend.clerkId, isTyping });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#141414]">
      {/* Header */}
      <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center px-4 gap-3">
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
          <MessageList messages={messages} myId={me.id} onJoinSession={onJoinSession} />
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
      />
    </div>
  );
}
