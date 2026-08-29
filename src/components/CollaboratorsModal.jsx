"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, UserMinus, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0];
}

function Avatar({ user, size = "w-9 h-9" }) {
  if (user?.imageUrl) {
    return (
      <img referrerPolicy="no-referrer"
        src={user.imageUrl}
        alt={user.name || "User"}
        className={`${size} rounded-full object-cover flex-shrink-0 bg-neutral-700`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-indigo-500 text-white text-xs font-bold`}>
      {getInitials(user?.name)}
    </div>
  );
}

export default function CollaboratorsModal({ playlist, onClose, onUpdate }) {
  const { user } = useUser();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const ownerId = playlist?.userId;
  const isOwner = ownerId && user?.id && String(ownerId) === String(user.id);
  const collaborators = playlist?.collaboratorInfo || [];
  const collaboratorIds = new Set(playlist?.collaborators || []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFriends(data.friends || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const addCollaborator = async (friend) => {
    setBusyId(friend.clerkId);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: playlist._id,
          action: "addCollaborator",
          song: friend.clerkId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate?.(data.playlist);
      } else {
        setError(data.error || "Could not add collaborator");
      }
    } catch {
      setError("Could not add collaborator");
    } finally {
      setBusyId(null);
    }
  };

  const removeCollaborator = async (collabId) => {
    setBusyId(collabId);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: playlist._id,
          action: "removeCollaborator",
          song: collabId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate?.(data.playlist);
      } else {
        setError(data.error || "Could not remove collaborator");
      }
    } catch {
      setError("Could not remove collaborator");
    } finally {
      setBusyId(null);
    }
  };

  const addableFriends = friends.filter(
    (f) => !collaboratorIds.has(f.clerkId) && String(f.clerkId) !== String(ownerId)
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm max-h-[85vh] bg-[#1a1a1a] rounded-2xl border border-[var(--tt-border)] shadow-2xl flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tt-border)] flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <Users className="w-5 h-5 text-green-400" />
            Collaborators
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-neutral-400 hover:text-white transition-colors active:scale-95" title="Close" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto scrollbar flex-1 min-h-0">
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {!isOwner && (
            <p className="text-xs text-neutral-400">
              You can add and remove songs in this collaborative playlist. Only the owner manages collaborators.
            </p>
          )}

          {}
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">
              Contributors
            </p>
            <div className="flex flex-col gap-2">
              {collaborators.length === 0 && (
                <p className="text-sm text-neutral-500">No collaborators yet.</p>
              )}
              {collaborators.map((collab) => (
                <div key={collab.clerkId} className="flex items-center gap-3">
                  <Avatar user={collab} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{collab.name}</p>
                    <p className="text-xs text-neutral-500 truncate">@{collab.username || "no username"}</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => removeCollaborator(collab.clerkId)}
                      disabled={busyId === collab.clerkId}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove collaborator"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {}
          {isOwner && (
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">
                Add friends
              </p>
              {loading ? (
                <p className="text-sm text-neutral-500 animate-pulse">Loading friends…</p>
              ) : addableFriends.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  All your friends are already collaborating, or you have none to add yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar pr-1">
                  {addableFriends.map((friend) => (
                    <div key={friend.clerkId} className="flex items-center gap-3">
                      <Avatar user={friend} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{friend.name}</p>
                        <p className="text-xs text-neutral-500 truncate">@{friend.username || "no username"}</p>
                      </div>
                      <button
                        onClick={() => addCollaborator(friend)}
                        disabled={busyId === friend.clerkId}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
