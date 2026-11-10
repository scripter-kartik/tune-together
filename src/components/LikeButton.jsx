"use client";

import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { toggleLike, useIsLiked } from "@/lib/library";

const TOAST_STYLE = {
  background: "#1a1a1a",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: "13px",
};

/** Heart that adds/removes a song from Liked Songs (with Spotify-style toast). */
export default function LikeButton({ song, size = 18, className = "", showToast = true }) {
  const liked = useIsLiked(song);
  if (!song) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const now = toggleLike(song);
        if (showToast) {
          toast(now ? "Added to Liked Songs" : "Removed from Liked Songs", {
            id: "tt-like",
            duration: 2000,
            style: TOAST_STYLE,
          });
        }
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      aria-pressed={liked}
      title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      className={`flex-shrink-0 inline-flex items-center justify-center transition active:scale-90 touch-manipulation ${
        liked ? "text-green-400" : "text-neutral-400 hover:text-white"
      } ${className}`}
    >
      <Heart style={{ width: size, height: size }} className={liked ? "fill-current" : ""} strokeWidth={2} />
    </button>
  );
}
