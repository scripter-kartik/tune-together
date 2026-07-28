"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, UserMinus, Shield, LogOut, Trash2, Pencil, Check } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { wrapCurrentKeyForNewMember } from "@/lib/e2eeClient";

/**
 * Group settings: rename (admin), add friends (admin, wraps current E2EE key
 * for them), remove/promote members (admin), leave, delete (admin).
 */
export default function GroupSettingsModal({ me, group, onClose, onChanged, onLeft }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [addableFriends, setAddableFriends] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // "leave" | "delete"

  const myRole = group.members.find((m) => m.clerkId === me.id)?.role;
  const amAdmin = myRole === "admin";
  const memberIds = new Set(group.members.map((m) => m.clerkId));

  useEffect(() => {
    if (!amAdmin) return;
    (async () => {
      try {
        const res = await fetch("/api/friends");
        const data = await res.json();
        setAddableFriends((data.friends || []).filter((f) => !memberIds.has(f.clerkId)));
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group._id, amAdmin]);

  const notify = (type) => {
    getSocket().emit("group-updated", { groupId: group._id, type });
    onChanged?.();
  };

  const act = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const rename = () =>
    act(async () => {
      const name = newName.trim();
      if (!name) return;
      const res = await fetch(`/api/groups/${group._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name }),
      });
      if (!res.ok) return setError((await res.json()).error);
      setRenaming(false);
      notify("rename");
    });

  const addMember = (friend) =>
    act(async () => {
      // Wrap the current group key for the new member on-device.
      const wrapped = await wrapCurrentKeyForNewMember(me.id, group, friend.clerkId);
      if (!wrapped) {
        setError(`${friend.name} hasn't set up secure chat yet (they need to sign in once).`);
        return;
      }
      const res = await fetch(`/api/groups/${group._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          userId: friend.clerkId,
          wrappedKey: wrapped.wrappedKey,
          iv: wrapped.iv,
        }),
      });
      if (!res.ok) return setError((await res.json()).error);
      setAddableFriends((prev) => prev.filter((f) => f.clerkId !== friend.clerkId));
      notify("member-add");
    });

  const removeMember = (clerkId) =>
    act(async () => {
      const res = await fetch(`/api/groups/${group._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId: clerkId }),
      });
      if (!res.ok) return setError((await res.json()).error);
      notify("member-remove"); // key rotated server-side; admin client re-wraps on next open
    });

  const promote = (clerkId) =>
    act(async () => {
      const res = await fetch(`/api/groups/${group._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote", userId: clerkId }),
      });
      if (!res.ok) return setError((await res.json()).error);
      notify("promote");
    });

  const leaveOrDelete = (action) =>
    act(async () => {
      const res = await fetch(`/api/groups/${group._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return setError((await res.json()).error);
      getSocket().emit("group-updated", { groupId: group._id, type: action });
      onLeft?.();
    });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / rename */}
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center text-xl flex-shrink-0">
            {group.icon || "🎧"}
          </div>
          {renaming ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && rename()}
                className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/60"
              />
              <button onClick={rename} className="text-green-400 hover:text-green-300 p-1">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h2 className="text-white font-bold text-lg truncate">{group.name}</h2>
              {amAdmin && (
                <button onClick={() => setRenaming(true)} className="text-neutral-500 hover:text-white p-1">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto scrollbar flex-1">
          {/* Members */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
              Members — {group.members.length}
            </h3>
            <div className="space-y-0.5">
              {group.members.map((m) => {
                const p = m.profile;
                return (
                  <div key={m.clerkId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    {p?.imageUrl ? (
                      <img referrerPolicy="no-referrer" src={p.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                        {(p?.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {p?.name || "Unknown"}
                        {m.clerkId === me.id && <span className="text-neutral-500"> (you)</span>}
                      </p>
                      <p className="text-[11px] text-neutral-500 capitalize">{m.role}</p>
                    </div>
                    {amAdmin && m.clerkId !== me.id && (
                      <div className="flex gap-1">
                        {m.role !== "admin" && (
                          <button
                            onClick={() => promote(m.clerkId)}
                            disabled={busy}
                            className="p-1.5 text-neutral-400 hover:text-green-400 transition"
                            title="Make admin"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeMember(m.clerkId)}
                          disabled={busy}
                          className="p-1.5 text-neutral-400 hover:text-red-400 transition"
                          title="Remove from group"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add friends (admin) */}
          {amAdmin && addableFriends.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                Add friends
              </h3>
              <div className="space-y-0.5">
                {addableFriends.map((f) => (
                  <div key={f.clerkId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    {f.imageUrl ? (
                      <img referrerPolicy="no-referrer" src={f.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                        {f.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <p className="flex-1 text-sm text-white truncate">{f.name}</p>
                    <button
                      onClick={() => addMember(f)}
                      disabled={busy}
                      className="p-1.5 text-green-400 hover:text-green-300 transition"
                      title="Add to group"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Danger zone */}
        <div className="p-5 border-t border-white/5 space-y-2">
          {confirmAction ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm text-neutral-300">
                {confirmAction === "delete" ? "Delete this group for everyone?" : "Leave this group?"}
              </p>
              <button
                onClick={() => leaveOrDelete(confirmAction)}
                disabled={busy}
                className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="text-neutral-400 hover:text-white text-sm px-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction("leave")}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-medium py-2 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" /> Leave group
              </button>
              {amAdmin && (
                <button
                  onClick={() => setConfirmAction("delete")}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium py-2 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete group
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
