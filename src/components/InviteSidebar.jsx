"use client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Share2, Copy, Check, QrCode } from "lucide-react";

export default function InviteSidebar({ inviteLink: initialInviteLink }) {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setInviteLink(initialInviteLink || window.location.href);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [initialInviteLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch (err) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "tune-together",
        text: "Join my room — let's listen to music together 🎧",
        url: inviteLink,
      });
    } catch (err) {}
  };

  return (
    <div className="flex flex-col bg-[#181818] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="bg-green-500/15 text-green-400 rounded-full p-2">
          <Share2 className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-white">Invite to the room</h2>
      </div>
      <p className="text-gray-400 text-sm mb-5">
        Anyone with this link joins your session — same songs, same queue, same chat.
      </p>

      <div className="flex items-center bg-black/40 border border-neutral-700 rounded-lg pl-3 pr-1 py-1 mb-3">
        <input
          type="text"
          className="bg-transparent text-gray-200 flex-1 outline-none text-sm font-mono truncate"
          value={inviteLink}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ml-2 transition ${
            copied
              ? "bg-green-500 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {canShare && (
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 w-full bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg py-2.5 text-sm font-semibold transition mb-5"
        >
          <Share2 className="w-4 h-4" />
          Share…
        </button>
      )}

      <div className="flex flex-col items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <QrCode className="w-3.5 h-3.5" />
          Scan to join
        </div>
        <div className="bg-white p-3 rounded-xl">
          {inviteLink && (
            <QRCode value={inviteLink} size={140} bgColor="#ffffff" fgColor="#111111" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span>1. Copy or scan</span>
        <span className="text-neutral-700">•</span>
        <span>2. Send it over</span>
        <span className="text-neutral-700">•</span>
        <span>3. Listen together</span>
      </div>
    </div>
  );
}
