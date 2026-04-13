/**
 * Encrypted storage for the user's Anthropic API key.
 *
 * Design:
 *  - A non-extractable AES-GCM key is generated once per browser profile and
 *    stored in IndexedDB as a CryptoKey. Because the CryptoKey is
 *    non-extractable, even a malicious script cannot exfiltrate the raw key
 *    material via IndexedDB dumps.
 *  - The API key is encrypted with that AES-GCM key and stored alongside the
 *    iv. Decryption is only possible from code running on the same origin.
 *  - This is NOT defense against a compromised page script that can call
 *    `loadApiKey()` directly — nothing in the browser can prevent that. It
 *    only protects against casual DevTools inspection and storage snapshots.
 */

import { get, set, del } from "idb-keyval";

const WRAP_KEY_NAME = "oal:wrap-key";
const CIPHERTEXT_NAME = "oal:api-key-ciphertext";

type Stored = {
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
};

async function getOrCreateWrapKey(): Promise<CryptoKey> {
  const existing = await get<CryptoKey>(WRAP_KEY_NAME);
  if (existing) return existing;

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    /* extractable */ false,
    ["encrypt", "decrypt"],
  );
  // idb-keyval can store CryptoKey objects via structured clone.
  await set(WRAP_KEY_NAME, key);
  return key;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (trimmed.length < 20) {
    throw new Error("API 키가 너무 짧습니다.");
  }
  // We deliberately do NOT enforce the `sk-ant-` prefix: if Anthropic ever
  // rotates their key format the app should still accept new keys rather
  // than locking users out. Actual validity is checked at first API call.
  const wrapKey = await getOrCreateWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    new TextEncoder().encode(trimmed),
  );
  const stored: Stored = { iv, ciphertext };
  await set(CIPHERTEXT_NAME, stored);
}

/** Best-effort prefix check. Returns a human warning if the key looks wrong. */
export function apiKeyWarning(apiKey: string): string | null {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) return null;
  if (!trimmed.startsWith("sk-ant-")) {
    return "Anthropic 키는 보통 sk-ant- 로 시작합니다. 그래도 저장할 수 있지만 호출이 실패할 수 있습니다.";
  }
  return null;
}

export async function loadApiKey(): Promise<string | null> {
  const stored = await get<Stored>(CIPHERTEXT_NAME);
  if (!stored) return null;
  const wrapKey = await getOrCreateWrapKey();
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: stored.iv as BufferSource },
      wrapKey,
      stored.ciphertext,
    );
    return new TextDecoder().decode(plain);
  } catch {
    // Wrap key rotated or storage corrupted.
    return null;
  }
}

export async function hasApiKey(): Promise<boolean> {
  const stored = await get<Stored>(CIPHERTEXT_NAME);
  return stored != null;
}

export async function clearApiKey(): Promise<void> {
  await del(CIPHERTEXT_NAME);
}
