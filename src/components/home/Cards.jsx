"use client";

import { useState } from "react";
import { Play, Pause, Music2 } from "lucide-react";

// Google-hosted artwork encodes its size in the URL (…=w120-h120-…); ask for
// one big enough to stay sharp on retina cards.
export function hiRes(url, px = 544) {
  if (!url || typeof url !== "string") return url;
  if (/googleusercontent\.com|ggpht\.com/.test(url)) {
    return url.replace(/=w\d+-h\d+/, `=w${px}-h${px}`).replace(/=s\d+(?=-|$)/, `=s${px}`);
  }
  return url;
}

export function PlayingBars({ className = "" }) {
  return (
    <span className={`flex items-end gap-[2px] h-3 flex-shrink-0 ${className}`} aria-hidden="true">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="w-[3px] rounded-full bg-green-400"
          style={{ animation: `equalize 0.9s ease-in-out ${d}s infinite` }}
        />
      ))}
    </span>
  );
}

const PLAY_SIZES = {
  lg: "w-10 h-10 sm:w-12 sm:h-12",
  sm: "w-8 h-8 lg:w-9 lg:h-9",
};

/** Green circular play/pause button. Hidden until hover with a mouse (see .tt-card-play). */
export function PlayButton({ playing = false, busy = false, visible = false, size = "lg", label, onClick, className = "" }) {
  const icon = size === "lg" ? "w-4 h-4 sm:w-5 sm:h-5" : "w-3.5 h-3.5 lg:w-4 lg:h-4";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      className={`tt-card-play ${visible ? "is-on" : ""} ${PLAY_SIZES[size]} flex-shrink-0 rounded-full bg-green-500 text-black flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation ${className}`}
    >
      {busy ? (
        <span className={`${icon} rounded-full border-2 border-black/25 border-t-black animate-spin`} />
      ) : playing ? (
        <Pause className={`${icon} fill-current`} />
      ) : (
        <Play className={`${icon} fill-current ml-0.5`} />
      )}
    </button>
  );
}

function Artwork({ image, alt, round, px = 544 }) {
  const [failed, setFailed] = useState(null);
  const [loaded, setLoaded] = useState(null);
  if (!image || failed === image) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Music2 className="w-8 h-8 text-neutral-500" />
      </div>
    );
  }
  return (
    <img
      referrerPolicy="no-referrer"
      // Cached images can finish before React attaches onLoad; check on mount.
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0 && loaded !== image) setLoaded(image);
      }}
      src={hiRes(image, px)}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(image)}
      onError={() => setFailed(image)}
      className={`w-full h-full object-cover transition-opacity duration-300 ${loaded === image ? "opacity-100" : "opacity-0"} ${round ? "rounded-full" : ""}`}
    />
  );
}

/**
 * Vertical card used by every shelf: songs, albums, mixes (square) and
 * artists (round). Clicking the card opens it, the green button plays it.
 */
export function MediaCard({
  image,
  title,
  subtitle,
  round = false,
  active = false,
  playing = false,
  busy = false,
  playLabel,
  onOpen,
  onPlay,
  onDoubleClick,
  onContextMenu,
  actions,
  coverActions,
  overlay,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      aria-label={subtitle ? `${title}, ${subtitle}` : title}
      className={`group relative min-w-0 p-2 sm:p-3 rounded-lg cursor-pointer select-none transition-colors duration-200 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
        active ? "bg-white/[0.06] hover:bg-white/[0.1]" : "hover:bg-white/[0.07] active:bg-white/[0.1]"
      }`}
    >
      <div className="relative mb-2 sm:mb-3">
        <div
          className={`relative aspect-square w-full overflow-hidden bg-[#282828] shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
            round ? "rounded-full" : "rounded-md"
          }`}
        >
          <Artwork image={image} alt="" round={round} />
          {overlay}
        </div>
        {coverActions && (
          <div className="absolute top-2 right-2 z-10 hidden [@media(hover:hover)]:flex gap-1.5">{coverActions}</div>
        )}
        {onPlay && (
          <PlayButton
            playing={playing}
            busy={busy}
            visible={active || busy}
            label={playLabel || `${playing ? "Pause" : "Play"} ${title}`}
            onClick={onPlay}
            className={`absolute z-10 ${round ? "bottom-1 right-1" : "bottom-2 right-2"}`}
          />
        )}
      </div>

      <div className="flex items-start gap-0.5 min-w-0">
        <div className="flex-1 min-w-0">
          <p
            className={`flex items-center gap-1.5 text-sm sm:text-[15px] font-semibold leading-snug ${
              active ? "text-green-400" : "text-white"
            }`}
          >
            {playing && <PlayingBars />}
            <span className="truncate">{title}</span>
          </p>
          {subtitle && (
            <p className="mt-0.5 sm:mt-1 text-[13px] sm:text-sm text-neutral-400 line-clamp-2 leading-snug break-words">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}

/** Mix artwork overlay: a colour band with the mix name, like daily-mix covers. */
export function MixOverlay({ title, tint }) {
  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{ background: `linear-gradient(to top, color-mix(in srgb, ${tint} 88%, #000) 0%, transparent 100%)` }}
      />
      <span className="absolute left-0 top-3 w-1.5 h-7 rounded-r pointer-events-none" style={{ background: tint }} />
      <p className="absolute left-3 right-3 bottom-2.5 text-white font-extrabold text-base sm:text-lg leading-tight drop-shadow line-clamp-2 pointer-events-none">
        {title}
      </p>
    </>
  );
}

/** Compact horizontal tile for the grid at the top of Home. */
export function ShortcutTile({ image, title, active, playing, busy, onOpen, onPlay, onHover }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onMouseEnter={onHover}
      onFocus={onHover}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      aria-label={title}
      className="group relative flex items-center h-12 sm:h-14 lg:h-16 min-w-0 rounded-[4px] overflow-hidden bg-white/[0.07] hover:bg-white/[0.14] active:bg-white/[0.18] cursor-pointer select-none transition-colors duration-200 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <div className="h-full aspect-square flex-shrink-0 bg-[#282828] shadow-[4px_0_12px_rgba(0,0,0,0.35)]">
        <Artwork image={image} alt="" px={160} />
      </div>
      <p className={`flex-1 min-w-0 px-2 sm:px-3 text-[13px] sm:text-sm font-bold leading-tight line-clamp-2 ${active ? "text-green-400" : "text-white"}`}>
        {title}
      </p>
      {playing && <PlayingBars className="mr-3 sm:hidden" />}
      {onPlay && (
        <PlayButton
          size="sm"
          playing={playing}
          busy={busy}
          visible={active || busy}
          label={`${playing ? "Pause" : "Play"} ${title}`}
          onClick={onPlay}
          className="hidden sm:flex mr-2"
        />
      )}
    </div>
  );
}
