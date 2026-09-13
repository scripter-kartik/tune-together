"use client";

import { useRef, useState } from "react";
import { UserPlus, Send, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { createPortal } from "react-dom";
import { getSocket } from "@/lib/socket";

export default function AddFriendButton() {
  const { isSignedIn } = useUser();
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const showPanel = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: Math.max(12, rect.top - 132), left: rect.right + 10 });
    }
    setOpen((value) => !value);
  };

  const sendRequest = async (event) => {
    event.preventDefault();
    const handle = username.trim().replace(/^@/, "").toLowerCase();
    if (!handle || sending) return;

    setSending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ type: "error", text: data.error || "Couldn't send request." });
        return;
      }
      if (data.recipientId) {
        getSocket().emit("friend-notify", { toClerkId: data.recipientId, type: "request" });
      }
      if (data.status === "accepted" && data.friend?.clerkId) {
        getSocket().emit("friend-notify", { toClerkId: data.friend.clerkId, type: "accept" });
      }
      setUsername("");
      setStatus({
        type: "success",
        text: data.status === "accepted" ? "You are now friends." : `Request sent to @${handle}.`,
      });
    } catch {
      setStatus({ type: "error", text: "Couldn't send request. Try again." });
    } finally {
      setSending(false);
    }
  };

  const panel = open && typeof document !== "undefined" && createPortal(
    <div
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 9999 }}
      className="w-[min(280px,calc(100vw-92px))] rounded-xl border border-[var(--tt-border)] bg-[#1e1e1e] p-3 shadow-2xl shadow-black/60"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Add a friend</p>
        <button onClick={() => setOpen(false)} className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      {!isSignedIn ? (
        <p className="text-xs text-neutral-400">Sign in to send friend requests.</p>
      ) : (
        <form onSubmit={sendRequest} className="flex gap-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@username"
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-sm text-white placeholder-neutral-600 outline-none focus:border-green-500"
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            disabled={!username.trim() || sending}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send friend request"
          >
            {sending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      )}
      {status && <p role="status" className={`mt-2 text-xs ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>{status.text}</p>}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={showPanel}
        className={`flex h-12 w-12 items-center justify-center rounded-[24px] transition-all duration-300 ${
          open ? "rounded-[16px] bg-green-500 text-black" : "bg-[#181818] text-neutral-400 hover:rounded-[16px] hover:bg-green-500 hover:text-black"
        }`}
        title="Add friend"
        aria-label="Add friend"
      >
        <UserPlus className="h-6 w-6" />
      </button>
      {panel}
    </>
  );
}
