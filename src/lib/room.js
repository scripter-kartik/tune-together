// Shared listening-room identity.
//
// The sync backend keys everything off a single roomId. For "listen together"
// to survive navigation across the whole site (home -> playlist -> chat and
// back), every page must resolve to the SAME room instead of minting its own.
//
// Resolution order: explicit ?room= in the URL wins (that's how invites land),
// then the persisted room in localStorage, then a fresh one. Whatever we land
// on is written back to both localStorage and the URL so the next page agrees.

const KEY = "tt-room";

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `r-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
  }
}

// Resolve (and persist) the room for the current page load.
export function resolveRoomId() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  let room = url.searchParams.get("room");
  let host = false;

  if (!room) {
    room = localStorage.getItem(KEY);
    if (!room) {
      room = newId();
      host = true;
    }
    url.searchParams.set("room", room);
    window.history.replaceState({}, "", url);
  }

  localStorage.setItem(KEY, room);
  return { roomId: room, isHost: host };
}

// Switch to a room (e.g. accepting a "listen together" invite) and persist it
// so it keeps following the user as they move around the site.
export function joinRoomId(room) {
  if (typeof window === "undefined" || !room) return;
  localStorage.setItem(KEY, room);
  const url = new URL(window.location.href);
  url.searchParams.set("room", room);
  window.history.pushState({}, "", url);
}

export function currentRoomId() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return url.searchParams.get("room") || localStorage.getItem(KEY) || "";
}
