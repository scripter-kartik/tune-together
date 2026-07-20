"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MessageCircle, Music, X } from "lucide-react";
import { getSocket } from "@/lib/socket";

function bodyFor(data) {
  if (data.type === "session-invite") return "invited you to sync music";
  return "sent you a message";
}

export default function ChatNotifications({ onOpenDm }) {
  const { user } = useUser();
  const activeChatRef = useRef(null);
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const onActive = (e) => {
      activeChatRef.current = e.detail || null;
    };
    window.addEventListener("tt-active-chat", onActive);
    return () => window.removeEventListener("tt-active-chat", onActive);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    socket.emit("register-user", user.id);

    const onDm = (data) => {
      if (!data?.senderId || data.senderId === user.id) return;

      const active = activeChatRef.current;
      if (active?.type === "dm" && active.id === data.senderId) return;

      clearTimeout(timerRef.current);
      setNotice({
        id: `${data.senderId}-${Date.now()}`,
        senderId: data.senderId,
        senderName: data.senderName || "Friend",
        senderImage: data.senderImage || null,
        type: data.type || "text",
        body: bodyFor(data),
      });
      timerRef.current = setTimeout(() => setNotice(null), 5200);
    };

    socket.on("receive-dm", onDm);
    return () => {
      socket.off("receive-dm", onDm);
      clearTimeout(timerRef.current);
    };
  }, [user?.id]);

  if (!notice) return null;

  const Icon = notice.type === "session-invite" ? Music : MessageCircle;

  return (
    <div className="fixed top-[max(env(safe-area-inset-top),10px)] left-1/2 z-[220] w-[calc(100%-24px)] max-w-sm -translate-x-1/2 animate-fade-up">
      <button
        onClick={() => {
          setNotice(null);
          onOpenDm?.(notice.senderId);
        }}
        className="w-full overflow-hidden rounded-[22px] border border-white/15 bg-neutral-950/85 text-left shadow-2xl shadow-black/50 backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="relative flex-shrink-0">
            {notice.senderImage ? (
              <img src={notice.senderImage} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                {notice.senderName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-black ring-2 ring-neutral-950">
              <Icon className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[13px] font-bold text-white">{notice.senderName}</p>
              <span className="text-[11px] font-medium text-neutral-500">now</span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-neutral-300">{notice.body}</p>
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setNotice(null);
            }}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-neutral-400 transition hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        </div>
      </button>
    </div>
  );
}
