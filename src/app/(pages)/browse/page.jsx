"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentRoomId } from "@/lib/room";

// Browse now lives inside the main app (so the sidebars, queue and player stay
// put). Old /browse links land there.
export default function BrowsePage() {
  const router = useRouter();
  useEffect(() => {
    try { sessionStorage.setItem("tt-open-browse", "1"); } catch {}
    const room = currentRoomId();
    router.replace(room ? `/?room=${encodeURIComponent(room)}` : "/");
  }, [router]);
  return <div className="h-full bg-black" />;
}
