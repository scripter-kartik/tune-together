"use client";
import { useRef, useState } from "react";
import QueueList from "./QueueList";
import ListeningUsers from "./ListeningUsers";
import SidebarLyrics from "./SidebarLyrics";
import { ListMusic, Users, MicVocal, X, PanelRightClose, PanelRightOpen } from "lucide-react";

export const RIGHT_TABS = [
  { id: "queue", label: "Queue", icon: ListMusic },
  { id: "lyrics", label: "Lyrics", icon: MicVocal },
  { id: "community", label: "Friends", icon: Users },
];

const TITLES = { queue: "Queue", lyrics: "Lyrics", community: "Friend activity" };

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition touch-manipulation"
    >
      {children}
    </button>
  );
}

/**
 * Collapsed, icon-only version of the right sidebar (desktop, lg+).
 * `activeTab` is highlighted only when the panel it controls is open.
 */
export function RightRail({ activeTab, queueCount = 0, onSelect, onExpand }) {
  return (
    <nav
      aria-label="Right sidebar"
      className="w-[68px] h-full flex-shrink-0 bg-[#121212] rounded-xl flex flex-col items-center py-3 gap-1"
    >
      <RailButton label="Open sidebar" onClick={onExpand}>
        <PanelRightOpen className="w-5 h-5" />
      </RailButton>
      <div className="w-6 h-px bg-white/10 my-2" />
      {RIGHT_TABS.map((tab) => (
        <RailButton
          key={tab.id}
          label={tab.label}
          active={activeTab === tab.id}
          badge={tab.id === "queue" ? queueCount : 0}
          onClick={() => onSelect(tab.id)}
        >
          <tab.icon className="w-5 h-5" />
        </RailButton>
      ))}
    </nav>
  );
}

export const RIGHT_MIN_W = 280;
export const RIGHT_DEFAULT_W = 340;

/**
 * Spotify-style drag handle on the panel's left edge.
 * While dragging it writes `--tt-right-w` straight onto `targetRef` (no React
 * re-render per frame) and commits the final width through `onResize`.
 * Dragging well past the minimum calls `onCollapse` when provided.
 */
export function ResizeHandle({ targetRef, width, getMax, onResize, onCollapse, onReset, className = "" }) {
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (w) => Math.round(Math.min(Math.max(w, RIGHT_MIN_W), Math.max(RIGHT_MIN_W, getMax())));
  const preview = (w) => targetRef.current?.style.setProperty("--tt-right-w", `${w}px`);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: width, raw: width };
    setDragging(true);
    document.body.classList.add("tt-resizing");
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const raw = drag.current.w + (drag.current.x - e.clientX);
    drag.current.raw = raw;
    const collapsing = onCollapse && raw < RIGHT_MIN_W - 80;
    targetRef.current?.classList.toggle("opacity-60", !!collapsing);
    preview(clamp(raw));
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { raw } = drag.current;
    drag.current = null;
    setDragging(false);
    document.body.classList.remove("tt-resizing");
    targetRef.current?.classList.remove("opacity-60");
    if (onCollapse && raw < RIGHT_MIN_W - 80) {
      preview(width);
      onCollapse();
      return;
    }
    onResize(clamp(raw));
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 48 : 16;
    let next = null;
    if (e.key === "ArrowLeft") next = width + step;
    else if (e.key === "ArrowRight") next = width - step;
    else if (e.key === "Home") next = RIGHT_MIN_W;
    else if (e.key === "End") next = getMax();
    if (next == null) return;
    e.preventDefault();
    const w = clamp(next);
    preview(w);
    onResize(w);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={RIGHT_MIN_W}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className={`group/resize absolute top-0 bottom-0 z-20 w-[10px] cursor-col-resize touch-none justify-center focus:outline-none ${className}`}
    >
      <span
        className={`h-full w-[2px] rounded-full transition-colors duration-150 ${
          dragging
            ? "bg-white/70"
            : "bg-transparent group-hover/resize:bg-white/30 group-focus-visible/resize:bg-white/70"
        }`}
      />
    </div>
  );
}

function RailButton({ label, active, badge = 0, onClick, children }) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`relative w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
          active ? "bg-white/[0.08] text-green-400" : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        {children}
        {badge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-green-500 text-black text-[10px] font-bold leading-4 text-center tabular-nums">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
      <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 z-30 whitespace-nowrap rounded-md bg-[#282828] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl shadow-black/50 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
        {label}
      </span>
    </div>
  );
}

/**
 * variant: "docked" (desktop column), "drawer" (overlay on tablet/phone).
 * In the drawer on phones the header doubles as a swipe-down handle.
 */
export default function RightPanel({
  queue = [],
  currentSong,
  isPlaying,
  onRemoveFromQueue,
  onClearQueue,
  activeTab = "queue",
  onTabChange,
  onClose,
  variant = "docked",
  onDragOffset,
}) {
  const isDrawer = variant === "drawer";
  const drag = useRef(null);
  const [dragY, setDragY] = useState(0);

  // Swipe-down-to-dismiss on the phone bottom sheet (header only, so lists still scroll).
  const onPointerDown = (e) => {
    if (!isDrawer || e.pointerType === "mouse" || window.innerWidth >= 640) return;
    if (e.target.closest("button")) return;
    drag.current = { y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    setDragY(dy);
    onDragOffset?.(dy);
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dragY > 110) onClose?.();
    setDragY(0);
    onDragOffset?.(0);
  };

  const lyricsTint = activeTab === "lyrics" && currentSong;

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#121212] overflow-hidden"
      style={
        lyricsTint
          ? { backgroundImage: "linear-gradient(to bottom, var(--tt-accent-soft), transparent 55%)" }
          : undefined
      }
    >
      <header
        className="flex-shrink-0 px-4 sm:px-5 pt-2 sm:pt-4 pb-3 select-none touch-none sm:touch-auto"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {isDrawer && <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />}

        <div className="flex items-center justify-between gap-2 min-h-9">
          <h2 className="text-white font-bold text-base sm:text-[17px] tracking-tight truncate">
            {TITLES[activeTab] || "Queue"}
          </h2>
          {onClose && (
            <IconButton label={isDrawer ? "Close" : "Collapse sidebar"} onClick={onClose}>
              {isDrawer ? <X className="w-5 h-5" /> : <PanelRightClose className="w-[18px] h-[18px]" />}
            </IconButton>
          )}
        </div>

        <div role="tablist" aria-label="Sidebar sections" className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {RIGHT_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors touch-manipulation ${
                  active ? "bg-white text-black" : "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" strokeWidth={2.4} />
                {tab.label}
                {tab.id === "queue" && queue.length > 0 && (
                  <span className={`tabular-nums text-[11px] ${active ? "text-black/60" : "text-white/50"}`}>
                    {queue.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div key={activeTab} className="flex-1 min-h-0 flex flex-col overflow-hidden animate-panel-in">
        {activeTab === "queue" ? (
          <QueueList
            queue={queue}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onRemove={onRemoveFromQueue}
            onClear={onClearQueue}
          />
        ) : activeTab === "lyrics" ? (
          <SidebarLyrics song={currentSong} />
        ) : (
          <ListeningUsers />
        )}
      </div>
    </div>
  );
}
