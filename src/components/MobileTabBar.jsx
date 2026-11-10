"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Library, MessageCircle } from "lucide-react";
import { currentRoomId } from "@/lib/room";

// Phone navigation, like Spotify's bottom bar. Hidden from md (tablets get the
// sidebars instead).
const TABS = [
  { id: "home", label: "Home", icon: Home, event: "tt-go-home" },
  { id: "search", label: "Search", icon: Search, event: "tt-open-browse" },
  { id: "library", label: "Your Library", icon: Library, event: "tt-open-library" },
  { id: "chat", label: "Chats", icon: MessageCircle, event: "tt-open-chat" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState("home");

  // Follow navigation that happens elsewhere (header Home, sidebar, links).
  useEffect(() => {
    const map = {
      "tt-go-home": "home",
      "tt-open-browse": "search",
      "tt-search": "search",
      "tt-open-chat": "chat",
    };
    const handlers = Object.entries(map).map(([evt, id]) => {
      const h = () => setActive(id);
      window.addEventListener(evt, h);
      return [evt, h];
    });
    return () => handlers.forEach(([evt, h]) => window.removeEventListener(evt, h));
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/chat")) setActive("chat");
  }, [pathname]);

  const go = (tab) => {
    if (tab.id !== "library") setActive(tab.id);
    if (pathname !== "/") {
      if (tab.id === "chat") {
        router.push("/chat");
        return;
      }
      if (tab.id === "search") {
        try { sessionStorage.setItem("tt-open-browse", "1"); } catch {}
      }
      const room = currentRoomId();
      router.push(room ? `/?room=${encodeURIComponent(room)}` : "/");
      return;
    }
    window.dispatchEvent(new CustomEvent(tab.event));
    if (tab.id === "search") {
      requestAnimationFrame(() => {
        [...document.querySelectorAll('input[placeholder*="play"]')].find((el) => el.offsetParent)?.focus();
      });
    }
  };

  return (
    <nav
      aria-label="Main"
      className="md:hidden flex-shrink-0 grid grid-cols-4 bg-gradient-to-t from-black via-black to-black/95 pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => go(tab)}
            aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium transition-colors active:scale-95 ${
              on ? "text-white" : "text-neutral-400"
            }`}
          >
            <tab.icon className="w-6 h-6" strokeWidth={on ? 2.6 : 1.9} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
