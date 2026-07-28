"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users, UserPlus, Check, X, AtSign, Music, Loader2, Share2,
} from "lucide-react";
import { getSocket } from "../lib/socket";

const avatar = (u) =>
  u?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u?.name || "user")}`;

const dotColor = {
  online: "bg-green-500",
  idle: "bg-yellow-500",
  offline: "bg-neutral-500",
};

export default function FriendsHub({ roomId }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("friends");

  const [me, setMe] = useState(null);
  const [data, setData] = useState({ friends: [], incoming: [], outgoing: [] });

  const [addInput, setAddInput] = useState("");
  const [addMsg, setAddMsg] = useState(null); // { type, text }
  const [addBusy, setAddBusy] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [nameMsg, setNameMsg] = useState(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [invited, setInvited] = useState(() => new Set());
  const socketRef = useRef(null);

  const setBusy = (id, on) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch("/api/users/me");
      if (r.ok) setMe((await r.json()).me);
    } catch {}
  }, []);

  const fetchFriends = useCallback(async () => {
    try {
      const r = await fetch("/api/friends");
      if (r.ok) {
        const d = await r.json();
        setData({ friends: d.friends || [], incoming: d.incoming || [], outgoing: d.outgoing || [] });
      }
    } catch {}
  }, []);

  // Keep the badge live even while the modal is closed: fetch on mount, poll,
  // and refresh instantly when a friend pings us over the socket.
  useEffect(() => {
    if (!user?.id) return;
    fetchMe();
    fetchFriends();

    const socket = getSocket();
    socketRef.current = socket;
    socket.emit("register-user", user.id);

    const onUpdate = () => fetchFriends();
    socket.on("friend-update", onUpdate);

    const poll = setInterval(fetchFriends, 45000);
    return () => {
      socket.off("friend-update", onUpdate);
      clearInterval(poll);
    };
  }, [user?.id, fetchMe, fetchFriends]);

  // While open, poll a little faster so presence/now-playing feels live.
  useEffect(() => {
    if (!open) return;
    fetchFriends();
    const t = setInterval(fetchFriends, 15000);
    return () => clearInterval(t);
  }, [open, fetchFriends]);

  const notify = (toClerkId, type) =>
    socketRef.current?.emit("friend-notify", { toClerkId, type });

  const claimUsername = async () => {
    const username = nameInput.trim().toLowerCase();
    if (!username) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const r = await fetch("/api/users/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await r.json();
      if (r.ok) {
        setMe((m) => ({ ...m, username: d.username }));
        setNameInput("");
        setNameMsg({ type: "ok", text: `You're @${d.username}` });
      } else {
        setNameMsg({ type: "err", text: d.error || "Couldn't set username." });
      }
    } catch {
      setNameMsg({ type: "err", text: "Something went wrong." });
    } finally {
      setNameBusy(false);
    }
  };

  const addFriend = async () => {
    const username = addInput.trim().toLowerCase().replace(/^@/, "");
    if (!username) return;
    setAddBusy(true);
    setAddMsg(null);
    try {
      const r = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await r.json();
      if (r.ok) {
        if (d.recipientId) notify(d.recipientId, "request");
        if (d.friend?.clerkId) notify(d.friend.clerkId, "accept");
        setAddInput("");
        setAddMsg({
          type: "ok",
          text: d.status === "accepted"
            ? `You're now friends with @${d.friend?.username}!`
            : `Request sent to @${username}.`,
        });
        fetchFriends();
      } else {
        setAddMsg({ type: "err", text: d.error || "Couldn't send request." });
      }
    } catch {
      setAddMsg({ type: "err", text: "Something went wrong." });
    } finally {
      setAddBusy(false);
    }
  };

  const respond = async (requesterId, action) => {
    setBusy(requesterId, true);
    try {
      const r = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, action }),
      });
      if (r.ok) {
        notify(requesterId, action === "accept" ? "accept" : "decline");
        fetchFriends();
      }
    } finally {
      setBusy(requesterId, false);
    }
  };

  const removeFriend = async (friendId) => {
    setBusy(friendId, true);
    try {
      const r = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (r.ok) {
        notify(friendId, "remove");
        fetchFriends();
      }
    } finally {
      setBusy(friendId, false);
    }
  };

  const inviteToRoom = (friend) => {
    if (!roomId) return;
    const link = `${window.location.origin}/?room=${roomId}`;
    socketRef.current?.emit("send-dm", {
      recipientId: friend.clerkId,
      message: `🎵 Come listen with me on Tune Together: ${link}`,
      senderName: user?.fullName || me?.name || "A friend",
      senderImage: user?.imageUrl || null,
    });
    navigator.clipboard?.writeText(link).catch(() => {});
    setInvited((prev) => new Set(prev).add(friend.clerkId));
    setTimeout(() => {
      setInvited((prev) => {
        const next = new Set(prev);
        next.delete(friend.clerkId);
        return next;
      });
    }, 2500);
  };

  const incomingCount = data.incoming.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white h-10 px-3 sm:px-4 text-sm font-semibold transition flex-shrink-0"
        title="Friends"
        aria-label="Friends"
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Friends</span>
        {incomingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-black text-[11px] font-bold flex items-center justify-center">
            {incomingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <h2 className="text-white font-bold text-lg">Friends</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-3 pt-3">
              {[
                { id: "friends", label: "Friends", count: data.friends.length },
                { id: "requests", label: "Requests", count: incomingCount, badge: true },
                { id: "add", label: "Add", icon: UserPlus },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
                    tab === t.id ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t.icon && <t.icon className="w-4 h-4" />}
                  {t.label}
                  {typeof t.count === "number" && t.count > 0 && (
                    <span className={`text-[11px] font-bold rounded-full px-1.5 ${t.badge ? "bg-green-500 text-black" : "bg-white/15 text-white"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-[280px]">
              {/* username nudge */}
              {me && !me.username && tab !== "add" && (
                <button
                  onClick={() => setTab("add")}
                  className="w-full mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm text-left hover:bg-green-500/15 transition"
                >
                  <AtSign className="w-4 h-4 flex-shrink-0" />
                  <span>Claim your username so friends can add you →</span>
                </button>
              )}

              {tab === "friends" && (
                <div className="space-y-1">
                  {data.friends.length === 0 && (
                    <EmptyState icon={Users} title="No friends yet" sub="Add someone by their @username to start listening together." />
                  )}
                  {data.friends.map((f) => (
                    <div key={f.clerkId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition group">
                      <Avatar user={f} status={f.onlineStatus} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{f.name}</p>
                        {f.currentlyPlaying ? (
                          <p className="text-[12px] text-green-400 truncate flex items-center gap-1">
                            <Music className="w-3 h-3 flex-shrink-0" />
                            {f.currentlyPlaying.songTitle}
                            {f.currentlyPlaying.artist ? ` · ${f.currentlyPlaying.artist}` : ""}
                          </p>
                        ) : (
                          <p className="text-[12px] text-neutral-500 truncate">
                            {f.username ? `@${f.username}` : capitalize(f.onlineStatus)}
                          </p>
                        )}
                      </div>
                      {roomId && (
                        <button
                          onClick={() => inviteToRoom(f)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            invited.has(f.clerkId)
                              ? "bg-green-500 text-black"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {invited.has(f.clerkId) ? <><Check className="w-3.5 h-3.5" /> Invited</> : <><Share2 className="w-3.5 h-3.5" /> Invite</>}
                        </button>
                      )}
                      <button
                        onClick={() => removeFriend(f.clerkId)}
                        disabled={busyIds.has(f.clerkId)}
                        className="p-1.5 rounded-full text-neutral-500 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Remove friend"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tab === "requests" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold px-1 mb-1">
                      Incoming
                    </p>
                    {data.incoming.length === 0 ? (
                      <p className="text-sm text-neutral-500 px-1 py-2">No incoming requests.</p>
                    ) : (
                      data.incoming.map((f) => (
                        <div key={f.clerkId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5">
                          <Avatar user={f} status={f.onlineStatus} />
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-semibold truncate">{f.name}</p>
                            <p className="text-[12px] text-neutral-500 truncate">{f.username ? `@${f.username}` : "wants to be friends"}</p>
                          </div>
                          <button
                            onClick={() => respond(f.clerkId, "accept")}
                            disabled={busyIds.has(f.clerkId)}
                            className="p-2 rounded-full bg-green-500 text-black hover:bg-green-400 transition"
                            aria-label="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => respond(f.clerkId, "decline")}
                            disabled={busyIds.has(f.clerkId)}
                            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                            aria-label="Decline"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold px-1 mb-1">
                      Sent
                    </p>
                    {data.outgoing.length === 0 ? (
                      <p className="text-sm text-neutral-500 px-1 py-2">No pending sent requests.</p>
                    ) : (
                      data.outgoing.map((f) => (
                        <div key={f.clerkId} className="flex items-center gap-3 p-2.5 rounded-xl">
                          <Avatar user={f} status={f.onlineStatus} />
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-semibold truncate">{f.name}</p>
                            <p className="text-[12px] text-neutral-500 truncate">{f.username ? `@${f.username}` : ""}</p>
                          </div>
                          <span className="text-xs text-yellow-500/90 font-semibold">Pending</span>
                          <button
                            onClick={() => removeFriend(f.clerkId)}
                            disabled={busyIds.has(f.clerkId)}
                            className="p-1.5 rounded-full text-neutral-500 hover:text-red-400 hover:bg-white/10 transition"
                            aria-label="Cancel request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === "add" && (
                <div className="space-y-6 pt-1">
                  {/* Your handle */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-2">
                      Your username
                    </p>
                    {me?.username ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5">
                        <AtSign className="w-4 h-4 text-green-500" />
                        <span className="text-white font-semibold">{me.username}</span>
                        <span className="text-xs text-neutral-500 ml-auto">friends add you with this</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 px-3 rounded-xl bg-white/5 focus-within:ring-1 focus-within:ring-green-500/50">
                          <AtSign className="w-4 h-4 text-neutral-400" />
                          <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value.toLowerCase())}
                            onKeyDown={(e) => e.key === "Enter" && claimUsername()}
                            placeholder="pick_a_handle"
                            maxLength={20}
                            className="flex-1 bg-transparent py-2.5 text-white text-sm outline-none placeholder-neutral-500"
                          />
                          <button
                            onClick={claimUsername}
                            disabled={nameBusy || !nameInput.trim()}
                            className="text-sm font-bold text-green-400 hover:text-green-300 disabled:opacity-40"
                          >
                            {nameBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim"}
                          </button>
                        </div>
                        {nameMsg && (
                          <p className={`text-xs mt-1.5 px-1 ${nameMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                            {nameMsg.text}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Add a friend */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-2">
                      Add a friend
                    </p>
                    <div className="flex items-center gap-2 px-3 rounded-xl bg-white/5 focus-within:ring-1 focus-within:ring-green-500/50">
                      <AtSign className="w-4 h-4 text-neutral-400" />
                      <input
                        value={addInput}
                        onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addFriend()}
                        placeholder="their_username"
                        className="flex-1 bg-transparent py-2.5 text-white text-sm outline-none placeholder-neutral-500"
                      />
                      <button
                        onClick={addFriend}
                        disabled={addBusy || !addInput.trim()}
                        className="flex items-center gap-1 text-sm font-bold text-green-400 hover:text-green-300 disabled:opacity-40"
                      >
                        {addBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add</>}
                      </button>
                    </div>
                    {addMsg && (
                      <p className={`text-xs mt-1.5 px-1 ${addMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                        {addMsg.text}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 mt-2 px-1">
                      Ask friends for their username and add them to invite them into your room.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Avatar({ user, status }) {
  return (
    <div className="relative flex-shrink-0">
      <img referrerPolicy="no-referrer" src={avatar(user)} alt={user.name} className="w-10 h-10 rounded-full object-cover bg-neutral-800" />
      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121212] ${dotColor[status] || dotColor.offline}`} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-neutral-500" />
      </div>
      <p className="text-white font-semibold">{title}</p>
      <p className="text-sm text-neutral-500 mt-1">{sub}</p>
    </div>
  );
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
