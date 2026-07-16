"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Plus,
  Hash,
  ArrowLeft,
  Lock,
  Search,
  Ban,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { ensureIdentityPublished } from "@/lib/e2eeClient";
import DmPane from "@/components/chat/DmPane";
import GroupPane from "@/components/chat/GroupPane";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import GroupSettingsModal from "@/components/chat/GroupSettingsModal";

function presence(lastActive) {
  if (!lastActive) return "offline";
  const mins = (Date.now() - new Date(lastActive)) / 60000;
  if (mins < 2) return "online";
  if (mins < 15) return "idle";
  return "offline";
}

const DOT = { online: "bg-green-500", idle: "bg-yellow-500", offline: "bg-neutral-600" };

function ChatPageInner() {
  const { user: me, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [blocked, setBlocked] = useState(new Set());
  const [active, setActive] = useState(null); // { type: "dm", friend } | { type: "group", group }
  const [filter, setFilter] = useState("");
  const [unread, setUnread] = useState({}); // key ("dm:<id>" | "group:<id>") → count
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [e2eeReady, setE2eeReady] = useState(false);
  const activeRef = useRef(null);
  activeRef.current = active;

  // ── Bootstrap: E2EE identity, socket registration, data ──────────────────
  useEffect(() => {
    if (!isLoaded || !me) return;

    ensureIdentityPublished()
      .then(() => setE2eeReady(true))
      .catch((e) => console.error("E2EE setup failed:", e));

    const socket = getSocket();
    socket.emit("register-user", me.id);

    // ?dm=<clerkId> deep-links straight into that DM (e.g. from the home
    // page's friends panel).
    const dmTarget = searchParams.get("dm");
    loadFriends().then((fs) => {
      if (dmTarget) {
        const friend = fs.find((f) => f.clerkId === dmTarget);
        if (friend) setActive({ type: "dm", friend });
      }
    });
    loadGroups();
    loadBlocked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, me?.id]);

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

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      const gs = data.groups || [];
      setGroups(gs);
      // Join socket channels for realtime group messages.
      getSocket().emit(
        "join-group-channels",
        gs.map((g) => g._id)
      );
      // Keep the open group fresh (members/keyVersion may have changed).
      const cur = activeRef.current;
      if (cur?.type === "group") {
        const updated = gs.find((g) => g._id === cur.group._id);
        if (updated) setActive({ type: "group", group: updated });
        else setActive(null); // removed from the group
      }
      return gs;
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

  // ── Live updates: unread badges + group refresh ───────────────────────────
  useEffect(() => {
    if (!me) return;
    const socket = getSocket();

    const onDm = (data) => {
      const cur = activeRef.current;
      if (cur?.type === "dm" && cur.friend.clerkId === data.senderId) return; // pane handles it
      setUnread((u) => ({ ...u, [`dm:${data.senderId}`]: (u[`dm:${data.senderId}`] || 0) + 1 }));
    };
    const onGroupMsg = ({ groupId }) => {
      const cur = activeRef.current;
      if (cur?.type === "group" && cur.group._id === groupId) return;
      setUnread((u) => ({ ...u, [`group:${groupId}`]: (u[`group:${groupId}`] || 0) + 1 }));
    };
    const onGroupUpdated = () => loadGroups();
    const onFriendUpdate = () => loadFriends();

    socket.on("receive-dm", onDm);
    socket.on("group-message", onGroupMsg);
    socket.on("group-updated", onGroupUpdated);
    socket.on("friend-update", onFriendUpdate);
    return () => {
      socket.off("receive-dm", onDm);
      socket.off("group-message", onGroupMsg);
      socket.off("group-updated", onGroupUpdated);
      socket.off("friend-update", onFriendUpdate);
    };
  }, [me, loadGroups, loadFriends]);

  const openDm = (friend) => {
    setActive({ type: "dm", friend });
    setUnread((u) => ({ ...u, [`dm:${friend.clerkId}`]: 0 }));
  };

  const openGroup = (group) => {
    setActive({ type: "group", group });
    setUnread((u) => ({ ...u, [`group:${group._id}`]: 0 }));
  };

  const joinSession = (roomId) => {
    router.push(`/?room=${roomId}`);
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

  if (!isLoaded) {
    return (
      <div className="h-[100dvh] bg-[#0e0e0e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
      </div>
    );
  }

  if (!me) {
    router.push("/sign-in");
    return null;
  }

  const q = filter.toLowerCase();
  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(q));
  const filteredFriends = friends.filter(
    (f) => f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q)
  );

  return (
    <div className="h-[100dvh] bg-[#0e0e0e] flex overflow-hidden text-white">
      {/* ── Left sidebar: conversations ── */}
      <div
        className={`w-full sm:w-72 flex-shrink-0 bg-[#111111] border-r border-white/5 flex-col ${
          active ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Top bar */}
        <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center px-4 gap-2">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-neutral-400 hover:text-white transition rounded-lg hover:bg-white/5"
            title="Back to music"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Messages</h1>
          <div
            className="ml-auto flex items-center gap-1 text-neutral-600"
            title={e2eeReady ? "End-to-end encryption active" : "Setting up encryption…"}
          >
            <Lock className={`w-3.5 h-3.5 ${e2eeReady ? "text-green-500/70" : ""}`} />
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm placeholder-neutral-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
          {/* Groups */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Groups
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1 text-neutral-400 hover:text-green-400 transition"
              title="Create a group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {filteredGroups.length === 0 && (
            <p className="px-2 pb-2 text-xs text-neutral-600">
              No groups yet — create one with your friends.
            </p>
          )}
          {filteredGroups.map((g) => {
            const isActive = active?.type === "group" && active.group._id === g._id;
            const count = unread[`group:${g._id}`] || 0;
            return (
              <button
                key={g._id}
                onClick={() => openGroup(g)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition text-left ${
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center text-base flex-shrink-0">
                  {g.icon || <Hash className="w-4 h-4 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${count ? "font-semibold text-white" : "text-neutral-300"}`}>
                    {g.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {g.members.length} members
                    {g.linkedRoomId && <span className="text-green-400"> · live session</span>}
                  </p>
                </div>
                {count > 0 && (
                  <span className="bg-green-500 text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}

          {/* DMs */}
          <div className="px-2 pt-4 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Direct messages
            </span>
          </div>
          {filteredFriends.length === 0 && (
            <p className="px-2 text-xs text-neutral-600">
              Add friends from the home page to start chatting.
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
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition text-left ${
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                } ${isBlocked ? "opacity-50" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  {f.imageUrl ? (
                    <img src={f.imageUrl} alt="" className="w-9 h-9 rounded-full" />
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

      {/* ── Main pane ── */}
      <div className={`flex-1 min-w-0 ${active ? "flex" : "hidden sm:flex"}`}>
        {active?.type === "dm" ? (
          blocked.has(active.friend.clerkId) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <Ban className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-neutral-300 font-medium">You blocked {active.friend.name}</p>
              <div className="flex items-center gap-5 mt-3">
                <button
                  onClick={() => setActive(null)}
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
              onJoinSession={joinSession}
              onBlock={() => toggleBlock(active.friend)}
              onBack={() => setActive(null)}
            />
          )
        ) : active?.type === "group" ? (
          <GroupPane
            me={me}
            group={active.group}
            onOpenSettings={() => setShowSettings(true)}
            onJoinSession={joinSession}
            onGroupChanged={loadGroups}
            onBack={() => setActive(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-[#141414]">
            <div className="w-20 h-20 bg-green-600/15 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-200">Your messages</h2>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">
              Pick a friend or group to start chatting — or create a group and
              listen to music together while you talk.
            </p>
            <p className="text-xs text-neutral-600 mt-4 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> All messages are end-to-end encrypted
            </p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <CreateGroupModal
          me={me}
          onClose={() => setShowCreate(false)}
          onCreated={async (group) => {
            setShowCreate(false);
            const gs = await loadGroups();
            const fresh = gs.find((g) => g._id === group._id);
            if (fresh) openGroup(fresh);
          }}
        />
      )}
      {showSettings && active?.type === "group" && (
        <GroupSettingsModal
          me={me}
          group={active.group}
          onClose={() => setShowSettings(false)}
          onChanged={loadGroups}
          onLeft={() => {
            setShowSettings(false);
            setActive(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}

// useSearchParams requires a Suspense boundary during prerender.
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] bg-[#0e0e0e] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
