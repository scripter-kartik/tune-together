











const KEY = "tt-sync";

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

export function endSyncSession() {
  if (typeof window === "undefined") return null;
  const prev = getSyncSession();
  localStorage.removeItem(KEY);
  window.dispatchEvent(
    new CustomEvent("tt-sync-status", { detail: { active: false } })
  );
  return prev;
}

export function isInSyncSession(roomId) {
  const s = getSyncSession();
  return !!s && s.roomId === roomId;
}
