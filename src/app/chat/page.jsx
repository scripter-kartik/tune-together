"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ChatHub from "@/components/chat/ChatHub";

import Header from "@/components/Header";

// Standalone chat route — kept for deep links / old bookmarks. The primary
// chat experience is ChatHub embedded in the home page (music keeps playing).
function ChatPageInner() {
  const searchParams = useSearchParams();
  const dm = searchParams.get("dm");
  const initialDm = useMemo(() => (dm ? { id: dm, ts: 0 } : null), [dm]);
  return <ChatHub initialDm={initialDm} />;
}

// useSearchParams requires a Suspense boundary during prerender.
export default function ChatPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#0e0e0e]">
      <Header />
      <div className="flex-1 overflow-hidden relative">
        <Suspense
          fallback={
            <div className="h-full bg-[#0e0e0e] flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
            </div>
          }
        >
          <ChatPageInner />
        </Suspense>
      </div>
    </div>
  );
}
