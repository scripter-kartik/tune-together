import Friendship from "@/lib/models/Friendship";

// ---------------------------------------------------------------------------
// Tiny in-memory rate limiter (per process). Good enough for a single-server
// deploy; swap for Redis if the app ever scales horizontally.
// ---------------------------------------------------------------------------

const buckets = new Map(); // key → { count, resetAt }

/**
 * Sliding-window-ish limiter. Returns true if the call is allowed.
 * e.g. rateLimit(`send:${userId}`, 20, 10_000) → 20 calls per 10s.
 */
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

// Periodically drop expired buckets so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}, 60_000).unref?.();

// ---------------------------------------------------------------------------
// Relationship helpers
// ---------------------------------------------------------------------------

/** True if the two users are accepted friends. */
export async function areFriends(userA, userB) {
  const row = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requesterId: userA, recipientId: userB },
      { requesterId: userB, recipientId: userA },
    ],
  }).lean();
  return !!row;
}

/** Membership entry for `clerkId` in a (lean) group doc, or null. */
export function memberOf(group, clerkId) {
  return group?.members?.find((m) => m.clerkId === clerkId) ?? null;
}

/** True if `clerkId` is an admin of the group. */
export function isAdmin(group, clerkId) {
  return memberOf(group, clerkId)?.role === "admin";
}
