









const KEY = "tt-room";

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `r-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
  }
}


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

// Deterministic shared room for a 1:1 chat: both friends compute the same id
// from their two clerk ids, so "listen together" needs no link-passing —

export function dmRoomId(a, b) {
  return `dm-${[a, b].sort().join("_")}`;
}
