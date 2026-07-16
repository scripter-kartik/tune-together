"use client";

/**
 * End-to-end encryption for Tune Together chat (WebCrypto, browser only).
 *
 * Identity: each device generates a P-256 ECDH keypair. The private key is
 * stored NON-EXTRACTABLE in IndexedDB (it never leaves this device); the
 * public key (JWK) is published to the server so others can encrypt to us.
 *
 * DMs:    AES-GCM key derived via ECDH(myPrivate, theirPublic) + HKDF.
 *         Both sides derive the same key, the server only ever sees ciphertext.
 * Groups: a random AES-256 "group key" encrypts all group messages. It is
 *         wrapped (encrypted) separately for every member using the same
 *         ECDH+HKDF scheme and stored server-side as opaque blobs. The key is
 *         rotated (keyVersion + 1) whenever a member is removed.
 *
 * Trade-off (inherent to E2EE): a brand-new device/browser cannot decrypt
 * old messages, because the private key never leaves the original device.
 */

const DB_NAME = "tt-e2ee";
const DB_STORE = "keys";
const KEY_ID = "identity-v1";

// ---------------------------------------------------------------------------
// IndexedDB helpers (CryptoKey objects are structured-cloneable)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

export function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

const te = new TextEncoder();
const td = new TextDecoder();

// ---------------------------------------------------------------------------
// Identity keys
// ---------------------------------------------------------------------------

/**
 * Get this device's identity keypair, generating one on first use.
 * Returns { privateKey: CryptoKey, publicKey: CryptoKey, publicKeyJwk }.
 */
export async function getOrCreateIdentity() {
  let record = await idbGet(KEY_ID);
  if (!record) {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false, // private key is NOT extractable — it cannot leave this device
      ["deriveKey", "deriveBits"]
    );
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    record = { privateKey: pair.privateKey, publicKey: pair.publicKey, publicKeyJwk };
    await idbSet(KEY_ID, record);
  }
  return record;
}

/** Import a peer's published public key JWK into a CryptoKey. */
export async function importPublicKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

// ---------------------------------------------------------------------------
// Shared-secret derivation (ECDH + HKDF → AES-GCM 256)
// ---------------------------------------------------------------------------

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
      salt: new Uint8Array(32), // static salt is OK: inputs are already high-entropy
      info: te.encode(info),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Stable per-pair HKDF info string so both sides derive the same DM key
 * regardless of who is sender/recipient.
 */
function dmInfo(idA, idB) {
  return "tt-dm-v1:" + [idA, idB].sort().join(":");
}

// ---------------------------------------------------------------------------
// DM encryption
// ---------------------------------------------------------------------------

/** Encrypt a DM. Returns { ciphertext, iv } (base64). */
export async function encryptDm(myId, theirId, theirPublicKeyJwk, plaintext) {
  const { privateKey } = await getOrCreateIdentity();
  const theirPub = await importPublicKey(theirPublicKeyJwk);
  const key = await deriveSharedAesKey(privateKey, theirPub, dmInfo(myId, theirId));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(plaintext));
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

/** Decrypt a DM sent between me and theirId. Returns plaintext or null. */
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
    return null; // wrong device / rotated keys — caller shows a placeholder
  }
}

// ---------------------------------------------------------------------------
// Group encryption
// ---------------------------------------------------------------------------

/** Generate a fresh random AES-256 group key (extractable so we can wrap it). */
export async function generateGroupKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Wrap a group key for one member using our identity key + their public key.
 * Returns { wrappedKey, iv } (base64) — an opaque blob safe to store server-side.
 */
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

/**
 * Unwrap a group key that `wrapperId` wrapped for me.
 * Returns an AES-GCM CryptoKey or null.
 */
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

/** Encrypt a group message with the unwrapped group key. */
export async function encryptGroupMessage(groupKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, groupKey, te.encode(plaintext));
  return { ciphertext: bufToB64(ct), iv: bufToB64(iv) };
}

/** Decrypt a group message. Returns plaintext or null. */
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

// ---------------------------------------------------------------------------
// In-memory group key cache (unwrapping is async + hits the network for JWKs)
// ---------------------------------------------------------------------------

const groupKeyCache = new Map(); // `${groupId}:${keyVersion}` → CryptoKey

export function cacheGroupKey(groupId, keyVersion, key) {
  groupKeyCache.set(`${groupId}:${keyVersion}`, key);
}

export function getCachedGroupKey(groupId, keyVersion) {
  return groupKeyCache.get(`${groupId}:${keyVersion}`) ?? null;
}
