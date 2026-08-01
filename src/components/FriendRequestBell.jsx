"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, UserCheck, X, Check } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { createPortal } from "react-dom";

export default function FriendRequestBell() {
  const { isSignedIn } = useUser();
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(false);
  const [actionDone, setActionDone] = useState({});
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const fetchRequests = async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.success) setRequests(data.incoming || []);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        // Check if click is inside the portal panel
        const panel = document.getElementById("tt-bell-panel");
        if (panel && panel.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen((o) => !o);
  };

  const handleRespond = async (senderId, action) => {
    setActionDone((prev) => ({ ...prev, [senderId]: action }));
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, action }),
      });
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.clerkId !== senderId));
        setActionDone((prev) => { const n = { ...prev }; delete n[senderId]; return n; });
      }, 1000);
    } catch {}
  };

  if (!isSignedIn) return null;

  const count = requests.length;

  const panel = open && typeof document !== "undefined" && createPortal(
    <div
      id="tt-bell-panel"
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
      className="w-72 bg-[#1e1e1e] border border-[var(--tt-border)] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150"
    >
      <div className="px-4 py-3 border-b border-[var(--tt-border)] flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Friend Requests</h3>
        <span className="text-xs text-neutral-400">{count} pending</span>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-neutral-500">
          <UserCheck className="w-8 h-8" />
          <p className="text-sm">No pending requests</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-[var(--tt-border)]">
          {requests.map((user) => {
            const done = actionDone[user.clerkId];
            return (
              <div key={user.clerkId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0">
                  {user.imageUrl ? (
                    <img referrerPolicy="no-referrer" src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-neutral-400 text-xs">wants to be your friend</p>
                </div>
                {done ? (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${done === "accept" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                    {done === "accept" ? "Accepted ✓" : "Declined"}
                  </span>
                ) : (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRespond(user.clerkId, "accept")}
                      className="w-8 h-8 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-black transition-colors"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRespond(user.clerkId, "decline")}
                      className="w-8 h-8 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-full flex items-center justify-center text-neutral-400 transition-colors"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );

  return (
    <div className="relative flex items-center justify-center w-full">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`relative w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-green-500 text-black rounded-[16px]"
            : "bg-[#181818] text-neutral-400 hover:bg-green-500 hover:text-black hover:rounded-[16px]"
        }`}
        title="Friend Requests"
      >
        <Bell className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce">
            {count}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
