import Friendship from "@/lib/models/Friendship";






const buckets = new Map(); 

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


setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}, 60_000).unref?.();





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

export function memberOf(group, clerkId) {
  return group?.members?.find((m) => m.clerkId === clerkId) ?? null;
}

export function isAdmin(group, clerkId) {
  return memberOf(group, clerkId)?.role === "admin";
}
