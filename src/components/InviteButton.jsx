"use client";
import { useState, useEffect } from "react";
import { Share2, X } from "lucide-react";
import InviteSidebar from "./InviteSidebar";

export default function InviteButton({ roomId }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !roomId) return;
    setLink(`${window.location.origin}/?room=${roomId}`);
  }, [roomId]);

  if (!roomId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#1e1e1e] hover:bg-[#2a2a2a] text-green-400 flex items-center gap-2 rounded-full px-3 sm:px-4 h-10 text-sm font-semibold transition cursor-pointer flex-shrink-0"
        title="Invite friends to this room"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Invite</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl scrollbar">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/40 hover:bg-white/15 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
            <InviteSidebar inviteLink={link} />
          </div>
        </div>
      )}
    </>
  );
}
