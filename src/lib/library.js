"use client";

// Liked songs and followed artists, saved in this browser (localStorage) and
// shared live between every component and open tab.

import { useSyncExternalStore } from "react";

const KEYS = { liked: "tt-liked-songs", followed: "tt-followed-artists" };
const EMPTY = [];
const cache = {};
const listeners = new Set();

function read(kind) {
  if (cache[kind]) return cache[kind];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS[kind]) || "[]");
    cache[kind] = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache[kind] = [];
  }
  return cache[kind];
}

function write(kind, list) {
  cache[kind] = list;
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify(list));
  } catch {
    /* storage full or blocked: keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    for (const kind of Object.keys(KEYS)) {
      if (e.key === KEYS[kind]) {
        delete cache[kind];
        listeners.forEach((l) => l());
      }
    }
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLibrary(kind) {
  return useSyncExternalStore(subscribe, () => read(kind), () => EMPTY);
}

// ---------- liked songs ----------

export const songKey = (s) => String(s?.youtubeId || s?.id || "");

const slimSong = (s) => ({
  id: s.id,
  youtubeId: s.youtubeId,
  title: s.title,
  duration: s.duration,
  preview: s.preview,
  artist: s.artist ? { id: s.artist.id ?? null, name: s.artist.name } : undefined,
  album: s.album
    ? {
        id: s.album.id,
        title: s.album.title,
        cover_small: s.album.cover_small,
        cover_medium: s.album.cover_medium,
        cover_big: s.album.cover_big,
      }
    : undefined,
  likedAt: Date.now(),
});

export function isLiked(song) {
  const k = songKey(song);
  return !!k && read("liked").some((x) => songKey(x) === k);
}

/** Toggles a song in Liked Songs; returns true if it is now liked. */
export function toggleLike(song) {
  if (!song) return false;
  const k = songKey(song);
  const list = read("liked");
  if (list.some((x) => songKey(x) === k)) {
    write("liked", list.filter((x) => songKey(x) !== k));
    return false;
  }
  write("liked", [slimSong(song), ...list]);
  return true;
}

export function useIsLiked(song) {
  const list = useLibrary("liked");
  const k = songKey(song);
  return !!k && list.some((x) => songKey(x) === k);
}

// ---------- followed artists ----------

export function toggleFollow(artist) {
  if (!artist?.id) return false;
  const id = String(artist.id);
  const list = read("followed");
  if (list.some((a) => String(a.id) === id)) {
    write("followed", list.filter((a) => String(a.id) !== id));
    return false;
  }
  write("followed", [{ id: artist.id, name: artist.name, image: artist.image || null, followedAt: Date.now() }, ...list]);
  return true;
}

export function useIsFollowing(artistId) {
  const list = useLibrary("followed");
  return artistId != null && list.some((a) => String(a.id) === String(artistId));
}
