"use client";

import { useState, useEffect } from "react";
import { X, Check, Users, Lock } from "lucide-react";
import { createAndPublishGroupKey } from "@/lib/e2eeClient";

const GROUP_ICONS = ["🎧", "🎵", "🔥", "🌙", "⚡", "💿", "🎸", "🎹", "🥁", "🎤"];

/**
 * Create a group: name + icon + pick friends. Generates the E2EE group key
 * client-side, wraps it for every member, and sends only wrapped blobs.
 */
export default function CreateGroupModal({ me, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎧");
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/friends");
        const data = await res.json();
        setFriends(data.friends || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const create = async () => {
    const cleanName = name.trim();
    if (!cleanName || selected.size === 0 || creating) return;
    setCreating(true);
    setError(null);
    try {
      const memberIds = [me.id, ...selected];
      // Mint the group key on-device and wrap for every member.
      const { wrappedKeys } = await createAndPublishGroupKey(me.id, null, 1, memberIds);

      if (!wrappedKeys.some((k) => k.memberId === me.id)) {
        setError("Could not set up encryption. Try reloading the page.");
        return;
      }

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, icon, memberIds, wrappedKeys }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create group");
        return;
      }
      onCreated(data.group);
    } catch (e) {
      console.error("Error creating group:", e);
      setError("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Create a group</h2>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> End-to-end encrypted
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar flex-1">
          {/* Icon + name */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. late night lo-fi"
              autoFocus
              className="mt-1.5 w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-green-500/60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Icon</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GROUP_ICONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                    icon === e ? "bg-green-500/30 ring-1 ring-green-500" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Friend picker */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Add friends ({selected.size} selected)
            </label>
            <div className="mt-1.5 space-y-0.5">
              {loading ? (
                <p className="text-sm text-neutral-500 py-4 text-center">Loading friends…</p>
              ) : friends.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">Add some friends first — groups are made of friends.</p>
                </div>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.clerkId}
                    onClick={() => toggle(f.clerkId)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition text-left"
                  >
                    {f.imageUrl ? (
                      <img referrerPolicy="no-referrer" src={f.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                        {f.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{f.name}</p>
                      {f.username && <p className="text-xs text-neutral-500">@{f.username}</p>}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        selected.has(f.clerkId)
                          ? "bg-green-500 border-green-500"
                          : "border-neutral-600"
                      }`}
                    >
                      {selected.has(f.clerkId) && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/5">
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <button
            onClick={create}
            disabled={!name.trim() || selected.size === 0 || creating}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-semibold py-2.5 rounded-lg transition"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}
