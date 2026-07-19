"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ChatHub from "@/components/chat/ChatHub";

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
    <Suspense
      fallback={
        <div className="h-[100dvh] bg-[#0e0e0e] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
