"use client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function InviteSidebar({ inviteLink: initialInviteLink }) {
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    setInviteLink(initialInviteLink || window.location.href);
  }, [initialInviteLink]);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] rounded-md p-4 items-center">
      <h2 className="text-lg font-bold text-green-400 mb-4">Invite Friends</h2>
      <p className="text-gray-300 mb-4 text-center">
        Share this link to invite friends to listen and chat together!
      </p>
      <div className="flex items-center bg-gray-800 rounded px-2 py-1 mb-2 w-full">
        <input
          type="text"
          className="bg-transparent text-white flex-1 outline-none font-mono"
          value={inviteLink}
          readOnly
        />
        <button
          onClick={handleCopy}
          className="bg-green-500 px-3 py-1 rounded text-white font-semibold ml-2 hover:bg-green-600 transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="my-4 bg-white p-2 rounded">
        {inviteLink && (
          <QRCode value={inviteLink} size={100} bgColor="#181818" fgColor="#22c55e" />
        )}
      </div>
      <div className="mt-4 flex flex-col items-center">
        <h3 className="text-green-300 mb-2">How it works?</h3>
        <ul className="text-gray-400 text-sm space-y-1 text-center">
          <li>1. Copy or scan the invite link</li>
          <li>2. Send it to your friends</li>
          <li>3. Chat & listen together!</li>
        </ul>
      </div>
    </div>
  );
}
