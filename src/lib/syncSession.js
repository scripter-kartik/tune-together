// Global sync-session tracking.
//
// A "sync session" is when two users share a deterministic DM room (e.g.
// "dm-userA_userB") for listen-together. This module persists whether we're
// in such a session, who the partner is, and lets any page/component check or
// end the sync without prop-drilling.
//
// Storage key: "tt-sync" → JSON { roomId, partnerName, partnerImage, partnerId }
// Events:
//   "tt-sync-status"  — dispatched whenever sync status changes.
//                       detail: { active: bool, roomId, partnerName, ... } | null

const KEY = "tt-sync";

/** Read the current sync session from localStorage. Returns null if none. */
export function getSyncSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.roomId) return data;
    return null;
  } catch {
    return null;
  }
}

/** Start (or update) a sync session. */
export function startSyncSession({ roomId, partnerName, partnerImage, partnerId }) {
  if (typeof window === "undefined") return;
  const data = {
    roomId,
    partnerName: partnerName || "Friend",
    partnerImage: partnerImage || null,
    partnerId: partnerId || null,
  };
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(
    new CustomEvent("tt-sync-status", { detail: { active: true, ...data } })
  );
}

/** End the sync session. Returns the old session data (or null). */
export function endSyncSession() {
  if (typeof window === "undefined") return null;
  const prev = getSyncSession();
  localStorage.removeItem(KEY);
  window.dispatchEvent(
    new CustomEvent("tt-sync-status", { detail: { active: false } })
  );
  return prev;
}

/** Check if the given roomId matches the active sync session. */
export function isInSyncSession(roomId) {
  const s = getSyncSession();
  return !!s && s.roomId === roomId;
}
