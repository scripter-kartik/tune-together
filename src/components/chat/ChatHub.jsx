"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  ArrowLeft,
  Lock,
  Search,
  Ban,
  UserPlus,
  Send,
  AtSign,
  Pencil,
  X,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { ensureIdentityPublished } from "@/lib/e2eeClient";
import DmPane from "@/components/chat/DmPane";

function presence(lastActive) {
  if (!lastActive) return "offline";
  const mins = (Date.now() - new Date(lastActive)) / 60000;
  if (mins < 2) return "online";
  if (mins < 15) return "idle";
  return "offline";
}

const DOT = { online: "bg-green-500", idle: "bg-yellow-500", offline: "bg-neutral-600" };

export default function ChatHub({ initialDm = null, embedded = false, onExit, onJoinSession, nowPlaying }) {
  const { user: me, isLoaded } = useUser();
  const router = useRouter();

  const [friends, setFriends] = useState([]);
  const [blocked, setBlocked] = useState(new Set());
  const [active, setActive] = useState(null); 
  const [filter, setFilter] = useState("");
  const [unread, setUnread] = useState({}); // key ("dm:<id>") -> count
  const [e2eeReady, setE2eeReady] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendRequestState, setFriendRequestState] = useState(null);
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameState, setUsernameState] = useState(null);
  const [savingUsername, setSavingUsername] = useState(false);
  // Mobile: the sidebar becomes a Discord-style slide-over drawer when a chat
  // is open. Opened via the header back button or an edge swipe from the left.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const edgeSwipeRef = useRef(null); // { x, y } of a touch that started at the left edge
  const drawerSwipeRef = useRef(null); // { x, y } of a touch on the open drawer
  const activeRef = useRef(null);
  activeRef.current = active;
  // DM requested before the friends list finished loading.
  const pendingDmRef = useRef(null);

  // ── Bootstrap: E2EE identity, socket registration, data ──────────────────
  useEffect(() => {
    if (!isLoaded || !me) return;

    ensureIdentityPublished()
      .then(() => setE2eeReady(true))
      .catch((e) => console.error("E2EE setup failed:", e));

    const socket = getSocket();
    socket.emit("register-user", me.id);

    loadFriends().then((fs) => {
      const id = pendingDmRef.current;
      if (id) {
        const friend = fs.find((f) => f.clerkId === id);
        if (friend) setActive({ type: "dm", friend });
        pendingDmRef.current = null;
      }
    });
    loadBlocked();
    
  }, [isLoaded, me?.id]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/users/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.me) return;
        setMyProfile(data.me);
        setUsernameDraft(data.me.username || "");
      })
      .catch(() => {});
  }, [me?.id]);

  
  useEffect(() => {
    const id = initialDm?.id;
    if (!id) return;
    const friend = friends.find((f) => f.clerkId === id);
    if (friend) {
      setActive({ type: "dm", friend });
      setUnread((u) => ({ ...u, [`dm:${id}`]: 0 }));
      setDrawerOpen(false);
    } else {
      pendingDmRef.current = id; 
    }
    
  }, [initialDm]);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      const fs = data.friends || [];
      setFriends(fs);
      return fs;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  const loadBlocked = useCallback(async () => {
    try {
      const res = await fetch("/api/blocks");
      const data = await res.json();
      setBlocked(new Set((data.blocked || []).map((u) => u.clerkId)));
    } catch (e) {
      console.error(e);
    }
  }, []);

  
  useEffect(() => {
    if (!me) return;
    const socket = getSocket();

    const onDm = (data) => {
      const cur = activeRef.current;
      if (cur?.type === "dm" && cur.friend.clerkId === data.senderId) return; 
      setUnread((u) => ({ ...u, [`dm:${data.senderId}`]: (u[`dm:${data.senderId}`] || 0) + 1 }));
    };
    const onFriendUpdate = () => loadFriends();

    socket.on("receive-dm", onDm);
    socket.on("friend-update", onFriendUpdate);
    return () => {
      socket.off("receive-dm", onDm);
      socket.off("friend-update", onFriendUpdate);
    };
  }, [me, loadFriends]);

  const openDm = (friend) => {
    setActive({ type: "dm", friend });
    setUnread((u) => ({ ...u, [`dm:${friend.clerkId}`]: 0 }));
    setDrawerOpen(false);
  };

  const sendFriendRequest = async (event) => {
    event.preventDefault();
    const username = friendUsername.trim().replace(/^@/, "").toLowerCase();
    if (!username || sendingFriendRequest) return;

    setSendingFriendRequest(true);
    setFriendRequestState(null);
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFriendRequestState({ type: "error", text: data.error || "Couldn't send request." });
        return;
      }

      const socket = getSocket();
      if (data.recipientId) socket.emit("friend-notify", { toClerkId: data.recipientId, type: "request" });
      if (data.status === "accepted" && data.friend?.clerkId) {
        socket.emit("friend-notify", { toClerkId: data.friend.clerkId, type: "accept" });
      }

      setFriendUsername("");
      setFriendRequestState({
        type: "success",
        text: data.status === "accepted"
          ? `You and @${data.friend?.username || username} can now chat.`
          : `Friend request sent to @${username}.`,
      });
      await loadFriends();
    } catch {
      setFriendRequestState({ type: "error", text: "Couldn't send request. Please try again." });
    } finally {
      setSendingFriendRequest(false);
    }
  };

  const saveUsername = async (event) => {
    event.preventDefault();
    const username = usernameDraft.trim().replace(/^@/, "").toLowerCase();
    if (!username || savingUsername) return;

    setSavingUsername(true);
    setUsernameState(null);
    try {
      const response = await fetch("/api/users/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) {
        setUsernameState({ type: "error", text: data.error || "Couldn't update username." });
        return;
      }
      setMyProfile((profile) => ({ ...profile, username: data.username }));
      setUsernameDraft(data.username);
      setUsernameState({ type: "success", text: "Username saved." });
    } catch {
      setUsernameState({ type: "error", text: "Couldn't update username. Please try again." });
    } finally {
      setSavingUsername(false);
    }
  };

  
  
  useEffect(() => {
    const detail = active
      ? { type: active.type, id: active.friend.clerkId }
      : null;
    window.dispatchEvent(new CustomEvent("tt-active-chat", { detail }));
    return () => window.dispatchEvent(new CustomEvent("tt-active-chat", { detail: null }));
  }, [active]);

  
  
  const joinSession = (roomId) => {
    if (onJoinSession) {
      onJoinSession(roomId);
    } else {
      
      
      
      if (typeof window !== "undefined") {
        localStorage.setItem("tt-room", roomId);
      }
      router.push(`/?room=${roomId}`);
    }
  };

  const goBack = () => {
    if (onExit) onExit();
    else router.push("/");
  };

  const toggleBlock = async (friend) => {
    const isBlocked = blocked.has(friend.clerkId);
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: friend.clerkId, action: isBlocked ? "unblock" : "block" }),
    });
    loadBlocked();
  };

  const rootClass = embedded
    ? "flex-1 min-w-0 h-full bg-[#0e0e0e] relative overflow-hidden text-white"
    : "h-[100dvh] bg-[#0e0e0e] relative overflow-hidden text-white";

  if (!isLoaded) {
    return (
      <div className={`${rootClass} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
      </div>
    );
  }

  if (!me) {
    if (!embedded) {
      router.push("/sign-in");
      return null;
    }
    return (
      <div className={`${rootClass} flex flex-col items-center justify-center gap-3 px-6 text-center`}>
        <MessageCircle className="w-10 h-10 text-green-400" />
        <p className="text-neutral-300 font-medium">Sign in to chat with your friends</p>
        <p className="text-sm text-neutral-500">Your music keeps playing either way.</p>
      </div>
    );
  }

  
  
  
  const onEdgeTouchStart = (e) => {
    const t = e.touches[0];
    edgeSwipeRef.current = t.clientX <= 24 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onEdgeTouchMove = (e) => {
    const s = edgeSwipeRef.current;
    if (!s) return;
    const t = e.touches[0];
    if (Math.abs(t.clientY - s.y) > 40) {
      edgeSwipeRef.current = null; 
      return;
    }
    if (t.clientX - s.x > 36) {
      edgeSwipeRef.current = null;
      setDrawerOpen(true);
    }
  };
  
  const onDrawerTouchStart = (e) => {
    const t = e.touches[0];
    drawerSwipeRef.current = { x: t.clientX, y: t.clientY };
  };
  const onDrawerTouchMove = (e) => {
    const s = drawerSwipeRef.current;
    if (!s) return;
    const t = e.touches[0];
    if (Math.abs(t.clientY - s.y) > 40) {
      drawerSwipeRef.current = null;
      return;
    }
    if (s.x - t.clientX > 48) {
      drawerSwipeRef.current = null;
      setDrawerOpen(false);
    }
  };

  const q = filter.toLowerCase();
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const filteredFriends = friends.filter(
    (f) => f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q)
  );

  return (
    <div className={rootClass}>
      <div className="relative z-10 flex w-full h-full">
      {}
      {drawerOpen && active && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[64] sm:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div
        onTouchStart={onDrawerTouchStart}
        onTouchMove={onDrawerTouchMove}
        className={`bg-white/[0.02] backdrop-blur-2xl border-r border-white/5 flex-col ${
          active
            ? drawerOpen
              ? "fixed inset-y-0 left-0 z-[65] w-[85vw] max-w-[320px] flex animate-slide-left shadow-2xl sm:static sm:z-auto sm:w-72 sm:max-w-none sm:animate-none sm:shadow-none sm:flex sm:flex-shrink-0"
              : "hidden sm:flex sm:w-72 sm:flex-shrink-0"
            : "flex w-full sm:w-72 flex-shrink-0"
        }`}
      >
        {}
        <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center px-4 gap-2">
          <button
            onClick={goBack}
            className="p-2 -ml-2 text-neutral-400 hover:text-white transition rounded-lg hover:bg-white/5"
            title="Back to music"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Messages</h1>
          <button
            onClick={() => {
              setUsernameDraft(myProfile?.username || "");
              setUsernameState(null);
              setProfileOpen(true);
            }}
            className="ml-auto flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white"
            title="Set or edit your username"
          >
            <AtSign className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden max-w-[90px] truncate sm:inline">
              {myProfile?.username || "Set username"}
            </span>
            <Pencil className="h-3 w-3 flex-shrink-0" />
          </button>
          <div
            className="flex items-center gap-1 text-neutral-600"
            title={e2eeReady ? "End-to-end encryption active" : "Setting up encryption…"}
          >
            <Lock className={`w-3.5 h-3.5 ${e2eeReady ? "text-green-500/70" : ""}`} />
          </div>
        </div>

        {}
        <div className="p-3">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/5 rounded-xl px-3 py-2 shadow-inner">
            <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm placeholder-neutral-600 focus:outline-none"
            />
          </div>
          <form onSubmit={sendFriendRequest} className="mt-2 flex items-center gap-1.5">
            <label className="sr-only" htmlFor="chat-friend-username">Friend username</label>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 focus-within:border-green-500/50">
              <UserPlus className="h-3.5 w-3.5 flex-shrink-0 text-neutral-500" />
              <input
                id="chat-friend-username"
                value={friendUsername}
                onChange={(event) => setFriendUsername(event.target.value)}
                placeholder="Add friend by @username"
                className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder-neutral-600 focus:outline-none"
                disabled={sendingFriendRequest}
              />
            </div>
            <button
              type="submit"
              disabled={!friendUsername.trim() || sendingFriendRequest}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-500 text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send friend request"
              title="Send friend request"
            >
              {sendingFriendRequest ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </form>
          {friendRequestState && (
            <p
              role="status"
              className={`mt-1.5 px-1 text-[11px] ${
                friendRequestState.type === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {friendRequestState.text}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
          {}
          <div className="px-2 pt-1 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Direct messages
            </span>
          </div>
          {filteredFriends.length === 0 && (
            <p className="px-2 text-xs text-neutral-600">
              No chats yet.
            </p>
          )}
          {filteredFriends.map((f) => {
            const isActive = active?.type === "dm" && active.friend.clerkId === f.clerkId;
            const count = unread[`dm:${f.clerkId}`] || 0;
            const p = f.onlineStatus || presence(f.lastActive);
            const isBlocked = blocked.has(f.clerkId);
            return (
              <button
                key={f.clerkId}
                onClick={() => openDm(f)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition text-left ${
                  isActive ? "bg-white/10 backdrop-blur-md shadow-sm border border-white/[0.05]" : "hover:bg-white/5 border border-transparent"
                } ${isBlocked ? "opacity-50" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  {f.imageUrl ? (
                    <img referrerPolicy="no-referrer" src={f.imageUrl} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-sm font-semibold">
                      {f.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111111] ${DOT[p] || DOT.offline}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${count ? "font-semibold text-white" : "text-neutral-300"}`}>
                    {f.name}
                    {isBlocked && <Ban className="w-3 h-3 inline ml-1 text-red-400" />}
                  </p>
                  {f.currentlyPlaying?.songTitle ? (
                    <p className="text-[11px] text-green-400 truncate">
                      ♫ {f.currentlyPlaying.songTitle}
                    </p>
                  ) : (
                    f.username && <p className="text-[11px] text-neutral-500">@{f.username}</p>
                  )}
                </div>
                {count > 0 && (
                  <span className="bg-green-500 text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            onClick={() => setProfileOpen(false)}
            aria-label="Close username editor"
          />
          <form
            onSubmit={saveUsername}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start gap-3">
              {me.imageUrl ? (
                <img referrerPolicy="no-referrer" src={me.imageUrl} alt="" className="h-11 w-11 rounded-full" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 font-bold">
                  {me.fullName?.charAt(0) || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-white">Your chat profile</h2>
                <p className="mt-0.5 text-xs text-neutral-400">Your @username lets friends find and add you.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label htmlFor="my-chat-username" className="mb-1.5 block text-xs font-semibold text-neutral-300">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 focus-within:border-green-500/60">
              <AtSign className="h-4 w-4 text-neutral-500" />
              <input
                id="my-chat-username"
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value.replace(/^@/, ""))}
                placeholder="your_username"
                maxLength={20}
                autoCapitalize="none"
                autoComplete="username"
                className="w-full bg-transparent py-3 text-sm text-white placeholder-neutral-600 focus:outline-none"
                disabled={savingUsername}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-500">3–20 characters: letters, numbers, and underscores.</p>
            {usernameState && (
              <p role="status" className={`mt-2 text-xs ${usernameState.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {usernameState.text}
              </p>
            )}
            <button
              type="submit"
              disabled={!usernameDraft.trim() || savingUsername}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="h-4 w-4" />
              {savingUsername ? "Saving…" : myProfile?.username ? "Save username" : "Create username"}
            </button>
          </form>
        </div>
      )}

      {}
      <div
        className={`flex-1 min-w-0 ${active ? "flex" : "hidden sm:flex"}`}
        onTouchStart={onEdgeTouchStart}
        onTouchMove={onEdgeTouchMove}
      >
        {active?.type === "dm" ? (
          blocked.has(active.friend.clerkId) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <Ban className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-neutral-300 font-medium">You blocked {active.friend.name}</p>
              <div className="flex items-center gap-5 mt-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-sm text-neutral-400 hover:text-white sm:hidden"
                >
                  Back
                </button>
                <button
                  onClick={() => toggleBlock(active.friend)}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  Unblock
                </button>
              </div>
            </div>
          ) : (
            <DmPane
              me={me}
              friend={active.friend}
              nowPlaying={nowPlaying}
              onJoinSession={joinSession}
              onBlock={() => toggleBlock(active.friend)}
              onBack={() => setDrawerOpen(true)}
              backBadge={totalUnread}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-transparent">
            <div className="w-20 h-20 bg-green-600/15 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-200">Your messages</h2>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">
              Pick a friend to start chatting and sync music while you talk.
            </p>
            <p className="text-xs text-neutral-600 mt-4 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> All messages are end-to-end encrypted
            </p>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
