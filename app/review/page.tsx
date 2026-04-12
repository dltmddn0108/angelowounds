"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReviewToolbar from "@/components/ReviewToolbar";
import SuggestionCard from "@/components/SuggestionCard";
import { useReviewStore } from "@/lib/store/review";
import { useSessionStore } from "@/lib/store/session";
import {
  loadCachedDirectory,
  openBackupDir,
  readNoteBytes,
  writeBackup,
  writeNoteBytes,
} from "@/lib/vault/fs-access";
import { applySuggestions } from "@/lib/vault/writer";

export default function ReviewPage() {
  const items = useReviewStore((s) => s.items);
  const floor = useReviewStore((s) => s.confidenceFloor);
  const recordUndo = useReviewStore((s) => s.recordUndo);
  const clearUndo = useReviewStore((s) => s.clearUndo);
  const undoLog = useReviewStore((s) => s.undoLog);

  const vault = useSessionStore((s) => s.vault);
  const parsed = useSessionStore((s) => s.parsed);
  const settings = useSessionStore((s) => s.settings);

  const setVault = useSessionStore((s) => s.setVault);

  const [applying, setApplying] = useState(false);
  const [stats, setStats] = useState({ applied: 0, demoted: 0, skipped: 0 });
  const [error, setError] = useState<string | null>(null);

  // Attempt to rehydrate vault handle from idb-keyval on mount (page refresh)
  useEffect(() => {
    if (vault) return;
    loadCachedDirectory().then(async (handle) => {
      if (!handle) return;
      // @ts-expect-error -- wicg-file-system-access
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") setVault(handle);
    });
  }, [vault, setVault]);

  const visible = useMemo(
    () => items.filter((it) => it.confidence >= floor),
    [items, floor],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const it of visible) {
      const bucket = map.get(it.sourcePath) ?? [];
      bucket.push(it);
      map.set(it.sourcePath, bucket);
    }
    return [...map.entries()];
  }, [visible]);

  async function applyAccepted() {
    if (!vault) {
      setError("보관함 연결이 풀렸습니다.");
      return;
    }
    setError(null);
    setApplying(true);
    const totals = { applied: 0, demoted: 0, skipped: 0 };
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");
    const backupDir = await openBackupDir(vault, timestamp);

    // Group accepted items by source path so we only rewrite each note once.
    const bySource = new Map<string, typeof items>();
    for (const it of items) {
      if (it.status !== "accepted") continue;
      const bucket = bySource.get(it.sourcePath) ?? [];
      bucket.push(it);
      bySource.set(it.sourcePath, bucket);
    }

    for (const [path, accepted] of bySource.entries()) {
      try {
        const entry = parsed.find((p) => p.entry.path === path)?.entry;
        if (!entry) continue;
        const current = await readNoteBytes(vault, path);
        await writeBackup(backupDir, path, current);
        const result = applySuggestions(entry, current, accepted, {
          seeAlsoHeader: settings.seeAlsoHeader,
        });
        if (result.content !== current) {
          await writeNoteBytes(vault, path, result.content);
          recordUndo({ path, previous: current });
        }
        totals.applied += result.applied;
        totals.demoted += result.demoted;
        totals.skipped += result.skipped;
      } catch (e) {
        setError(`${path}: ${(e as Error).message}`);
      }
    }
    setStats(totals);
    setApplying(false);
  }

  async function undoAll() {
    if (!vault) return;
    for (const entry of undoLog) {
      try {
        await writeNoteBytes(vault, entry.path, entry.previous);
      } catch (e) {
        console.error(e);
      }
    }
    clearUndo();
  }

  return (
    <main className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">제안 검토</h1>
        <Link href="/vault" className="text-sm text-neutral-500 hover:underline">
          ← 스캔
        </Link>
      </header>

      <ReviewToolbar
        onApply={applyAccepted}
        onUndoAll={undoAll}
        applying={applying}
        applied={stats.applied}
        demoted={stats.demoted}
        skipped={stats.skipped}
      />

      {error && (
        <div className="rounded border border-red-400 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {grouped.length === 0 && !vault && (
        <div className="rounded border border-amber-400 bg-amber-50 p-6 text-center text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
          보관함 연결이 필요합니다.{" "}
          <Link href="/vault" className="font-medium underline">
            스캔 페이지로 이동
          </Link>
          하여 보관함을 먼저 스캔해 주세요.
        </div>
      )}

      {grouped.length === 0 && vault && (
        <div className="rounded border border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
          표시할 제안이 없습니다. 스캔을 먼저 실행하거나 신뢰도 임계값을
          낮춰 보세요.
        </div>
      )}

      {grouped.map(([source, group]) => (
        <section key={source} className="space-y-2">
          <h2 className="font-mono text-sm text-neutral-500">{source}</h2>
          <div className="space-y-2">
            {group.map((it) => (
              <SuggestionCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
