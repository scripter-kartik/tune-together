"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Hash, Users, Music, Settings, KeyRound } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getSocket } from "@/lib/socket";
import { getGroupKey, encryptGroupMessage, decryptGroupMessage } from "@/lib/e2eeClient";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function presenceOf(profile) {
  if (!profile?.lastActive) return "offline";
  const mins = (Date.now() - new Date(profile.lastActive)) / 60000;
  if (mins < 2) return "online";
  if (mins < 15) return "idle";
  return "offline";
}

const DOT = { online: "bg-green-500", idle: "bg-yellow-500", offline: "bg-neutral-600" };

/**
 * A group chat pane: E2EE message thread + member sidebar + listening session
 * launcher. `group` comes hydrated from /api/groups (members[].profile).
 */
export default function GroupPane({ me, group, onOpenSettings, onJoinSession, onGroupChanged }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupKey, setGroupKey] = useState(null);
  const [keyStatus, setKeyStatus] = useState("loading"); // loading | ready | awaiting-admin | wrong-device
  const [typingUsers, setTypingUsers] = useState({});
  const [showMembers, setShowMembers] = useState(true);
  const [replyTo, setReplyTo] = useState(null); // ui message being replied to
  const [editing, setEditing] = useState(null); // ui message being edited
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const keyRef = useRef(null);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const toUiMessage = useCallback(
    async (row, key) => {
      const deleted = !!row.deletedForEveryone;
      let text = row.systemText || "";
      let failed = false;
      if (row.type === "text" && !deleted) {
        text = key ? await decryptGroupMessage(key, row.ciphertext, row.iv) : null;
        failed = text === null;
        text = text ?? "";
      }
      return {
        id: row._id || `live-${row.senderId}-${+new Date(row.createdAt)}`,
        senderId: row.senderId,
        senderName: row.senderId === me.id ? me.fullName || "You" : row.senderName,
        senderImage: row.senderId === me.id ? me.imageUrl : row.senderImage,
        text: deleted ? "" : text,
        failed,
        encrypted: row.type === "text",
        type: row.type,
        roomId: row.roomId,
        replyToId: row.replyToId || null,
        reactions: row.reactions || [],
        edited: !!row.edited,
        deleted,
        timestamp: new Date(row.createdAt || Date.now()),
      };
    },
    [me.id, me.fullName, me.imageUrl]
  );

  // Unwrap group key + load history.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setKeyStatus("loading");
    setReplyTo(null);
    setEditing(null);

    (async () => {
      try {
        const { key, reason } = await getGroupKey(me.id, group);
        if (cancelled) return;
        keyRef.current = key;
        setGroupKey(key);
        setKeyStatus(key ? "ready" : reason || "awaiting-admin");

        const res = await fetch(`/api/groups/${group._id}/messages`);
        const data = await res.json();
        const ui = await Promise.all((data.messages || []).map((m) => toUiMessage(m, key)));
        if (!cancelled) {
          setMessages(ui);
          scrollToBottom();
        }
      } catch (e) {
        console.error("Error loading group:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const socket = getSocket();
    socketRef.current = socket;

    const onGroupMessage = async ({ groupId, message }) => {
      if (groupId !== group._id) return;
      const ui = await toUiMessage(message, keyRef.current);
      setMessages((prev) => [...prev, ui]);
      scrollToBottom();
    };
    const onGroupTyping = ({ groupId, senderId, senderName, isTyping }) => {
      if (groupId !== group._id || senderId === me.id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[senderId] = senderName;
        else delete next[senderId];
        return next;
      });
      if (isTyping)
        setTimeout(
          () =>
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[senderId];
              return next;
            }),
          4000
        );
    };
    const onGroupUpdated = ({ groupId }) => {
      if (groupId === group._id) onGroupChanged?.();
    };
    // A member reacted / edited / deleted a message; re-render that row.
    const onMessageUpdated = async ({ groupId, message }) => {
      if (groupId !== group._id || !message?._id) return;
      const ui = await toUiMessage(message, keyRef.current);
      setMessages((prev) => prev.map((m) => (m.id === message._id ? ui : m)));
    };

    socket.on("group-message", onGroupMessage);
    socket.on("group-typing", onGroupTyping);
    socket.on("group-updated", onGroupUpdated);
    socket.on("group-message-updated", onMessageUpdated);
    return () => {
      cancelled = true;
      socket.off("group-message", onGroupMessage);
      socket.off("group-typing", onGroupTyping);
      socket.off("group-updated", onGroupUpdated);
      socket.off("group-message-updated", onMessageUpdated);
    };
    // group.keyVersion in deps: re-run unwrap after a rotation.
  }, [group._id, group.keyVersion, me.id, toUiMessage]);

  const sendMessage = async (text) => {
    if (!keyRef.current) return;

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
      const { ciphertext, iv } = await encryptGroupMessage(keyRef.current, text);

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

      const res = await fetch(`/api/groups/${group._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext,
          iv,
          keyVersion: group.keyVersion,
          replyToId: reply?.id || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        // Swap the temp id for the real one so actions target it.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tmpId
              ? { ...m, id: data.message._id, replyToId: data.message.replyToId || null }
              : m
          )
        );
        socketRef.current?.emit("group-message", {
          groupId: group._id,
          message: data.message,
        });
      } else if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      }
    } catch (e) {
      console.error("Error sending group message:", e);
    }
  };

  // Shared PATCH runner for react / edit / delete, then sync members via socket.
  const patchMessage = async (msg, action, extra = {}) => {
    try {
      const body = { action };
      if (action === "react") body.emoji = extra.emoji;
      if (action === "edit") {
        if (!keyRef.current) return;
        const { ciphertext, iv } = await encryptGroupMessage(keyRef.current, extra.text);
        body.ciphertext = ciphertext;
        body.iv = iv;
      }

      const res = await fetch(`/api/groups/${group._id}/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return;

      const ui = await toUiMessage(data.message, keyRef.current);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? ui : m)));

      socketRef.current?.emit("group-message-updated", {
        groupId: group._id,
        message: data.message,
      });
    } catch (e) {
      console.error(`Error on group ${action}:`, e);
    }
  };

  const emitTyping = (isTyping) =>
    socketRef.current?.emit("group-typing", {
      groupId: group._id,
      isTyping,
      senderName: me.firstName || me.fullName || "Someone",
    });

  // Start (or join) a listening session for this group.
  const startSession = async () => {
    const roomId = group.linkedRoomId || uuidv4();
    if (!group.linkedRoomId) {
      await fetch(`/api/groups/${group._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-room", roomId }),
      });
      socketRef.current?.emit("group-updated", { groupId: group._id, type: "session" });
      onGroupChanged?.();
    }
    onJoinSession(roomId);
  };

  const typingNames = Object.values(typingUsers);
  const online = group.members.filter((m) => presenceOf(m.profile) === "online");
  const iAmAdmin = group.members.some((m) => m.clerkId === me.id && m.role === "admin");

  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col min-w-0 bg-[#141414]">
        {/* Header */}
        <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center text-lg flex-shrink-0">
            {group.icon || <Hash className="w-4 h-4 text-green-400" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm truncate">{group.name}</h2>
            <p className="text-xs text-neutral-500">
              {group.members.length} members · {online.length} online
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={startSession}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                group.linkedRoomId
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-green-500 text-black hover:bg-green-400"
              }`}
              title={group.linkedRoomId ? "Join the live session" : "Start listening together"}
            >
              <Music className="w-3.5 h-3.5" />
              {group.linkedRoomId ? "Join session" : "Listen together"}
            </button>
            <button
              onClick={() => setShowMembers((s) => !s)}
              className={`p-2 rounded-lg transition ${showMembers ? "text-white bg-white/10" : "text-neutral-400 hover:text-white"}`}
              title="Toggle member list"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-neutral-400 hover:text-white transition"
              title="Group settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400" />
            </div>
          ) : keyStatus === "awaiting-admin" ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <KeyRound className="w-10 h-10 text-yellow-500 mb-3" />
              <p className="text-neutral-300 font-medium">Waiting for a group admin</p>
              <p className="text-neutral-500 text-xs mt-2 max-w-sm">
                The group's encryption key was rotated. An admin needs to open this
                group once to issue you a new key.
              </p>
            </div>
          ) : keyStatus === "wrong-device" ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <KeyRound className="w-10 h-10 text-yellow-500 mb-3" />
              <p className="text-neutral-300 font-medium">This device can't read this chat yet</p>
              <p className="text-neutral-500 text-xs mt-2 max-w-sm">
                Your encryption keys live on the device you first used. Ask an admin to
                open the group to re-issue your key for this device.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mb-3 text-2xl">
                {group.icon || "🎧"}
              </div>
              <p className="text-neutral-300 font-medium">Welcome to {group.name}</p>
              <p className="text-neutral-500 text-xs mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Messages are end-to-end encrypted
              </p>
            </div>
          ) : (
            <MessageList
              messages={messages}
              myId={me.id}
              onJoinSession={onJoinSession}
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
              canDelete={(msg) => msg.senderId === me.id || iAmAdmin}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {typingNames.length > 0 && (
          <p className="px-6 pb-1 text-xs text-green-400 italic">
            {typingNames.slice(0, 3).join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </p>
        )}

        <MessageInput
          placeholder={`Message ${group.name}`}
          onSend={sendMessage}
          onTyping={emitTyping}
          disabled={keyStatus !== "ready"}
          disabledHint="Encryption key unavailable on this device"
          replyTo={replyTo ? { senderName: replyTo.senderName, text: replyTo.text.slice(0, 60) } : null}
          editing={editing ? { text: editing.text } : null}
          onCancelContext={() => {
            setReplyTo(null);
            setEditing(null);
          }}
        />
      </div>

      {/* Member list (Discord right panel) */}
      {showMembers && (
        <div className="w-56 flex-shrink-0 bg-[#101010] border-l border-white/5 overflow-y-auto scrollbar hidden lg:block">
          <div className="p-4">
            {["admin", "member"].map((role) => {
              const members = group.members.filter((m) => m.role === role);
              if (!members.length) return null;
              return (
                <div key={role} className="mb-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    {role === "admin" ? "Admins" : "Members"} — {members.length}
                  </h4>
                  {members.map((m) => {
                    const p = m.profile;
                    const presence = presenceOf(p);
                    return (
                      <div
                        key={m.clerkId}
                        className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <div className="relative flex-shrink-0">
                          {p?.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                              {(p?.name || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101010] ${DOT[presence]}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${presence === "offline" ? "text-neutral-500" : "text-neutral-200"}`}>
                            {p?.name || "Unknown"}
                            {m.clerkId === me.id && <span className="text-neutral-500"> (you)</span>}
                          </p>
                          {p?.currentlyPlaying?.songTitle && (
                            <p className="text-[11px] text-green-400 truncate flex items-center gap-1">
                              <Music className="w-2.5 h-2.5 flex-shrink-0" />
                              {p.currentlyPlaying.songTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
