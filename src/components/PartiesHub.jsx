"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Calendar,
  X,
  Users,
  PartyPopper,
  Clock,
  Plus,
  Check,
  Trash2,
  ListMusic,
  UserCircle2,
} from "lucide-react";
import { joinRoomId } from "@/lib/room";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Started";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `in ${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `in ${hours}h`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `in ${mins}m` : "Now";
}

function PartyRow({ party, userId, onStart, onCancel, onJoin }) {
  const isHost = party.hostId === userId;
  const started = !!party.startedAt;
  const router = useRouter();

  const handleJoin = () => {
    if (party.roomId) {
      joinRoomId(party.roomId);
      router.push(`/?room=${party.roomId}`);
      onJoin?.(party);
    } else if (isHost) {
      onStart?.(party);
    }
  };

  return (
    <div className={`p-3 rounded-xl transition-colors ${started ? "bg-green-500/5 border border-green-500/20" : "bg-white/5 hover:bg-white/10"}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold truncate">{party.name}</p>
            {started && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                LIVE
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-xs mt-0.5">
            {isHost ? "You're hosting" : `By ${party.host?.name || "someone"}`}
            <span className="mx-1">•</span>
            {started ? (
              <span className="text-green-400">Started</span>
            ) : (
              <span className="text-neutral-500">{formatDate(party.scheduledAt)}</span>
            )}
          </p>
          {party.description && (
            <p className="text-neutral-500 text-xs mt-1 truncate">{party.description}</p>
          )}
          {party.invitees.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Users className="w-3 h-3 text-neutral-500" />
              <div className="flex -space-x-1.5">
                {party.invitees.slice(0, 4).map((inv) =>
                  inv.imageUrl ? (
                    <img
                      key={inv.clerkId}
                      src={inv.imageUrl}
                      alt={inv.name}
                      className="w-5 h-5 rounded-full border border-[#1a1a1a] object-cover"
                    />
                  ) : (
                    <div
                      key={inv.clerkId}
                      className="w-5 h-5 rounded-full bg-neutral-700 border border-[#1a1a1a] flex items-center justify-center text-[7px] font-bold text-white"
                    >
                      {getInitials(inv.name)}
                    </div>
                  )
                )}
              </div>
              <span className="text-neutral-500 text-[10px]">
                {party.invitees.length} invitee{party.invitees.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!started && isHost && (
            <button
              onClick={() => onStart(party)}
              className="px-3 py-1.5 rounded-full bg-green-500 hover:bg-green-400 text-black text-xs font-bold transition-colors"
              title="Start now"
            >
              Start
            </button>
          )}
          {!started && (
            <button
              onClick={handleJoin}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              Join
            </button>
          )}
          {started && (
            <button
              onClick={handleJoin}
              className="px-3 py-1.5 rounded-full bg-green-500 hover:bg-green-400 text-black text-xs font-bold transition-colors"
            >
              Enter
            </button>
          )}
          {isHost && !started && (
            <button
              onClick={() => onCancel(party._id)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Cancel party"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartiesHub({ open: isOpen, onClose }) {
  const { user } = useUser();
  const [tab, setTab] = useState("upcoming");
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const menuRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    scheduledAt: "",
    inviteeIds: [],
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/parties").then((r) => r.json()),
      fetch("/api/friends").then((r) => r.json()),
    ])
      .then(([pRes, fRes]) => {
        if (cancelled) return;
        setParties(pRes.parties || []);
        setFriends(fRes.friends || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isOpen]);

  const toggleInvitee = (clerkId) => {
    setForm((prev) => ({
      ...prev,
      inviteeIds: prev.inviteeIds.includes(clerkId)
        ? prev.inviteeIds.filter((i) => i !== clerkId)
        : [...prev.inviteeIds, clerkId],
    }));
  };

  const createParty = async () => {
    if (!form.name.trim()) return;
    setBusyId("create");
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          scheduledAt: form.scheduledAt || new Date().toISOString(),
          inviteeIds: form.inviteeIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParties((prev) => [...prev, data.party]);
        setForm({ name: "", description: "", scheduledAt: "", inviteeIds: [] });
        setTab("upcoming");
      }
    } catch {}
    setBusyId(null);
  };

  const startParty = async (party) => {
    setBusyId(party._id);
    try {
      const res = await fetch("/api/parties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party._id, action: "start" }),
      });
      const data = await res.json();
      if (data.success && data.roomId) {
        joinRoomId(data.roomId);
        window.dispatchEvent(new CustomEvent("tt-join-room", { detail: data.roomId }));
        window.dispatchEvent(new CustomEvent("tt-open-chat"));
        onClose();
      }
    } catch {}
    setBusyId(null);
  };

  const cancelParty = async (partyId) => {
    if (!confirm("Cancel this party?")) return;
    setBusyId(partyId);
    try {
      const res = await fetch("/api/parties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, action: "cancel" }),
      });
      const data = await res.json();
      if (data.success) {
        setParties((prev) => prev.filter((p) => p._id !== partyId));
      }
    } catch {}
    setBusyId(null);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] bg-[#1a1a1a] rounded-2xl border border-[var(--tt-border)] shadow-2xl flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tt-border)] flex-shrink-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <PartyPopper className="w-5 h-5 text-purple-400" />
            Listening Parties
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-3 gap-1 border-b border-[var(--tt-border)] flex-shrink-0">
          {[
            { key: "upcoming", label: "Upcoming", icon: Clock },
            { key: "create", label: "Create", icon: Plus },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === key
                  ? "text-white border-purple-400"
                  : "text-neutral-500 border-transparent hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar p-4 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-neutral-700 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : tab === "upcoming" ? (
            <div className="flex flex-col gap-2">
              {parties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PartyPopper className="w-10 h-10 text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-500">No parties yet</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    Create one and invite your friends to listen together.
                  </p>
                </div>
              ) : (
                parties.map((p) => (
                  <PartyRow
                    key={p._id}
                    party={p}
                    userId={user?.id}
                    onStart={startParty}
                    onCancel={cancelParty}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-neutral-400 font-semibold mb-1.5">Party name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Album release night..."
                  className="w-full bg-white/5 border border-[var(--tt-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 font-semibold mb-1.5">When</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full bg-white/5 border border-[var(--tt-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 transition-colors"
                />
                <p className="text-[11px] text-neutral-600 mt-1">Leave blank to start anytime</p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 font-semibold mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's playing tonight..."
                  className="w-full bg-white/5 border border-[var(--tt-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 font-semibold mb-1.5">
                  Invite friends ({form.inviteeIds.length} selected)
                </label>
                {friends.length === 0 ? (
                  <p className="text-xs text-neutral-500">Add friends first to invite them.</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto scrollbar pr-1">
                    {friends.map((f) => {
                      const selected = form.inviteeIds.includes(f.clerkId);
                      return (
                        <button
                          key={f.clerkId}
                          onClick={() => toggleInvitee(f.clerkId)}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                            selected ? "bg-purple-500/10 border border-purple-500/30" : "hover:bg-white/5"
                          }`}
                        >
                          {f.imageUrl ? (
                            <img referrerPolicy="no-referrer"
                              src={f.imageUrl}
                              alt={f.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {getInitials(f.name)}
                            </div>
                          )}
                          <span className="text-sm text-white flex-1 truncate">{f.name}</span>
                          {selected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={createParty}
                disabled={!form.name.trim() || busyId === "create"}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busyId === "create" ? "Creating..." : "Create Party"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
