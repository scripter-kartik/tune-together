"use client";


const DB_NAME = "tt-e2ee";
const DB_STORE = "keys";
const KEY_ID = "identity-v1";





function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}





export function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

const te = new TextEncoder();
const td = new TextDecoder();





export async function getOrCreateIdentity() {
  let record = await idbGet(KEY_ID);
  if (!record) {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false, 
      ["deriveKey", "deriveBits"]
    );
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    record = { privateKey: pair.privateKey, publicKey: pair.publicKey, publicKeyJwk };
    await idbSet(KEY_ID, record);
  }
  return record;
}

export async function importPublicKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}





async function deriveSharedAesKey(myPrivateKey, theirPublicKey, info) {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256
  );
  const hkdfKey = await crypto.subtle.importKey("raw", bits, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32), 
      info: te.encode(info),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function dmInfo(idA, idB) {
  return "tt-dm-v1:" + [idA, idB].sort().join(":");
}





export async function encryptDm(myId, theirId, theirPublicKeyJwk, plaintext) {
  const { privateKey } = await getOrCreateIdentity();
  const theirPub = await importPublicKey(theirPublicKeyJwk);
  const key = await deriveSharedAesKey(privateKey, theirPub, dmInfo(myId, theirId));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(plaintext));
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

export async function decryptDm(myId, theirId, theirPublicKeyJwk, ciphertext, iv) {
  try {
    const { privateKey } = await getOrCreateIdentity();
    const theirPub = await importPublicKey(theirPublicKeyJwk);
    const key = await deriveSharedAesKey(privateKey, theirPub, dmInfo(myId, theirId));
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(iv)) },
      key,
      b64ToBuf(ciphertext)
    );
    return td.decode(pt);
  } catch {
    return null; 
  }
}





export async function generateGroupKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapGroupKeyFor(myId, memberId, memberPublicKeyJwk, groupKey) {
  const { privateKey } = await getOrCreateIdentity();
  const memberPub = await importPublicKey(memberPublicKeyJwk);
  const wrappingKey = await deriveSharedAesKey(
    privateKey,
    memberPub,
    dmInfo(myId, memberId)
  );
  const raw = await crypto.subtle.exportKey("raw", groupKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, raw);
  return { wrappedKey: bufToB64(ct), iv: bufToB64(iv) };
}

export async function unwrapGroupKey(myId, wrapperId, wrapperPublicKeyJwk, wrappedKey, iv) {
  try {
    const { privateKey } = await getOrCreateIdentity();
    const wrapperPub = await importPublicKey(wrapperPublicKeyJwk);
    const wrappingKey = await deriveSharedAesKey(
      privateKey,
      wrapperPub,
      dmInfo(myId, wrapperId)
    );
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(iv)) },
      wrappingKey,
      b64ToBuf(wrappedKey)
    );
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  } catch {
    return null;
  }
}

export async function encryptGroupMessage(groupKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, groupKey, te.encode(plaintext));
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

export async function decryptGroupMessage(groupKey, ciphertext, iv) {
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(iv)) },
      groupKey,
      b64ToBuf(ciphertext)
    );
    return td.decode(pt);
  } catch {
    return null;
  }
}





const groupKeyCache = new Map(); 

export function cacheGroupKey(groupId, keyVersion, key) {
  groupKeyCache.set(`${groupId}:${keyVersion}`, key);
}

export function getCachedGroupKey(groupId, keyVersion) {
  return groupKeyCache.get(`${groupId}:${keyVersion}`) ?? null;
}
