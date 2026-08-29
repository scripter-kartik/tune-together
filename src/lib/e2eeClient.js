"use client";


import {
  getOrCreateIdentity,
  encryptDm,
  decryptDm,
  generateGroupKey,
  wrapGroupKeyFor,
  unwrapGroupKey,
  encryptGroupMessage,
  decryptGroupMessage,
  cacheGroupKey,
  getCachedGroupKey,
} from "@/lib/crypto";






let bootPromise = null;

export function ensureIdentityPublished() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const { publicKeyJwk } = await getOrCreateIdentity();
      await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKeyJwk }),
      });
      return publicKeyJwk;
    })().catch((e) => {
      bootPromise = null; 
      throw e;
    });
  }
  return bootPromise;
}





const peerKeys = new Map(); 

export async function getPeerKeys(ids) {
  const missing = ids.filter((id) => !peerKeys.has(id));
  if (missing.length) {
    const res = await fetch(`/api/keys?ids=${missing.join(",")}`);
    const data = await res.json();
    for (const id of missing) peerKeys.set(id, data.keys?.[id] ?? null);
  }
  const out = {};
  for (const id of ids) out[id] = peerKeys.get(id) ?? null;
  return out;
}

export async function getPeerKey(id) {
  return (await getPeerKeys([id]))[id];
}





export async function encryptDmTo(myId, theirId, plaintext) {
  const theirKey = await getPeerKey(theirId);
  if (!theirKey) return null;
  return encryptDm(myId, theirId, theirKey, plaintext);
}

export async function decryptDmRow(myId, otherId, row) {
  if (row.ciphertext && row.iv) {
    const theirKey = await getPeerKey(otherId);
    if (!theirKey) return null;
    return decryptDm(myId, otherId, theirKey, row.ciphertext, row.iv);
  }
  return row.message ?? null;
}





export async function getGroupKey(myId, group) {
  const cached = getCachedGroupKey(group._id, group.keyVersion);
  if (cached) return { key: cached, keyVersion: group.keyVersion };

  const res = await fetch(`/api/groups/${group._id}/keys`);
  const data = await res.json();

  if (data.key) {
    const key = await unwrapGroupKey(
      myId,
      data.key.wrapperId,
      data.key.wrapperPublicKeyJwk,
      data.key.wrappedKey,
      data.key.iv
    );
    if (key) {
      cacheGroupKey(group._id, data.key.keyVersion, key);
      return { key, keyVersion: data.key.keyVersion };
    }
    return { key: null, keyVersion: group.keyVersion, reason: "wrong-device" };
  }

  if (data.needsRewrap && data.isAdmin) {
    
    const { key, keyVersion } = await createAndPublishGroupKey(
      myId,
      group._id,
      data.keyVersion,
      group.members.map((m) => m.clerkId)
    );
    return { key, keyVersion };
  }

  return { key: null, keyVersion: group.keyVersion, reason: "awaiting-admin" };
}

export async function createAndPublishGroupKey(myId, groupId, keyVersion, memberIds) {
  const key = await generateGroupKey();
  const keys = await getPeerKeys(memberIds);

  const wrappedKeys = [];
  for (const memberId of memberIds) {
    const jwk = keys[memberId];
    if (!jwk) continue; 
    const { wrappedKey, iv } = await wrapGroupKeyFor(myId, memberId, jwk, key);
    wrappedKeys.push({ memberId, wrappedKey, iv });
  }

  if (groupId) {
    await fetch(`/api/groups/${groupId}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyVersion, wrappedKeys }),
    });
    cacheGroupKey(groupId, keyVersion, key);
  }

  return { key, keyVersion, wrappedKeys };
}

export async function wrapCurrentKeyForNewMember(myId, group, newMemberId) {
  const { key } = await getGroupKey(myId, group);
  if (!key) return null;
  const jwk = await getPeerKey(newMemberId);
  if (!jwk) return null;
  return wrapGroupKeyFor(myId, newMemberId, jwk, key);
}

export { encryptGroupMessage, decryptGroupMessage };
