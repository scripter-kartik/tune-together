"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";

/**
 * WhatsApp-style GIF & sticker picker.
 * Trending on open, debounced search, infinite scroll (load-more sentinel).
 * Backed by /api/gifs — Giphy when GIPHY_API_KEY is set, curated fallback otherwise.
 */
export default function MediaPicker({ onClose, onPickGif, onPickSticker }) {
  const [tab, setTab] = useState("gifs");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef(null);
  const reqIdRef = useRef(0);

  const fetchPage = useCallback(async (type, q, offset, append) => {
    const reqId = ++reqIdRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams({ type, offset: String(offset) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/gifs?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (reqId !== reqIdRef.current) return; // stale response
      setResults((prev) => (append ? [...prev, ...data.results] : data.results));
      setNext(data.next);
    } catch {
      if (reqId === reqIdRef.current && !append) {
        setResults([]);
        setNext(null);
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Tab switch / query change → debounced fresh load, scroll back to top.
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0 });
      fetchPage(tab, query.trim(), 0, false);
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, query, fetchPage]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || next === null || loading || loadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      fetchPage(tab, query.trim(), next, true);
    }
  };

  const pick = (item) => (tab === "gifs" ? onPickGif(item.url) : onPickSticker(item.url));

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 max-w-sm w-full bg-black/85 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50">
      {/* Tabs + close */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex gap-1 bg-white/[0.06] rounded-full p-0.5">
          {["gifs", "stickers"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition ${
                tab === t ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              {t === "gifs" ? "GIFs" : "Stickers"}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white transition p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-green-500/50 transition">
          <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (query ? setQuery("") : onClose())}
            placeholder={tab === "gifs" ? "Search GIFs" : "Search stickers"}
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none min-w-0"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-neutral-500 hover:text-white transition flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="px-2 pb-2 h-64 overflow-y-auto scrollbar overscroll-contain"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-1 text-center px-4">
            <p className="text-sm text-neutral-300 font-medium">No results</p>
            <p className="text-xs text-neutral-500">Try a different search</p>
          </div>
        ) : tab === "gifs" ? (
          // Two masonry-style columns so mixed aspect ratios pack tight (WhatsApp look).
          <div className="flex gap-1.5 items-start">
            {[0, 1].map((col) => (
              <div key={col} className="flex-1 flex flex-col gap-1.5 min-w-0">
                {results
                  .filter((_, i) => i % 2 === col)
                  .map((item) => (
                    <button key={item.id} onClick={() => pick(item)} className="block w-full">
                      <img
                        src={item.preview}
                        alt=""
                        loading="lazy"
                        style={{ aspectRatio: `${item.width || 200} / ${item.height || 200}` }}
                        className="w-full rounded-lg object-cover bg-white/[0.04] cursor-pointer hover:opacity-80 active:scale-95 transition"
                      />
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => pick(item)}
                className="aspect-square rounded-lg cursor-pointer hover:bg-white/10 active:scale-90 transition p-1"
              >
                <img src={item.preview} alt="" loading="lazy" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
