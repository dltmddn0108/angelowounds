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
  if (!apiKey.startsWith("sk-ant-")) {
    throw new Error("Invalid Anthropic API key format — expected sk-ant-…");
  }
  const wrapKey = await getOrCreateWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    new TextEncoder().encode(apiKey),
  );
  const stored: Stored = { iv, ciphertext };
  await set(CIPHERTEXT_NAME, stored);
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
