"use client";

import { useEffect, useState } from "react";
import {
  ensureReadWrite,
  forgetCachedDirectory,
  loadCachedDirectory,
  pickVaultDirectory,
} from "@/lib/vault/fs-access";
import { useSessionStore } from "@/lib/store/session";

export default function VaultPicker() {
  const vault = useSessionStore((s) => s.vault);
  const vaultName = useSessionStore((s) => s.vaultName);
  const setVault = useSessionStore((s) => s.setVault);
  const setSettings = useSessionStore((s) => s.setSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to rehydrate a previously picked directory. We still need a user
    // gesture to call requestPermission, so we only *query* here.
    loadCachedDirectory().then(async (handle) => {
      if (!handle) return;
      // @ts-expect-error -- wicg-file-system-access
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") setVault(handle);
    });
  }, [setVault]);

  async function onPick() {
    setError(null);
    try {
      const handle = await pickVaultDirectory();
      const ok = await ensureReadWrite(handle);
      if (!ok) {
        setError("읽기/쓰기 권한이 거부되었습니다.");
        return;
      }
      setVault(handle);
      setSettings({ cloudSynced: "unknown" });
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.toLowerCase().includes("abort")) setError(msg);
    }
  }

  async function onDisconnect() {
    await forgetCachedDirectory();
    setVault(null);
  }

  return (
    <section className="space-y-3 rounded border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-medium">보관함</h2>
      {vault ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            연결됨
          </span>
          <span className="font-mono text-sm">{vaultName}</span>
          <button
            onClick={onDisconnect}
            className="ml-auto rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            연결 해제
          </button>
        </div>
      ) : (
        <button
          onClick={onPick}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          옵시디언 보관함 폴더 선택
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
