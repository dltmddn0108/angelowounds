"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReviewToolbar from "@/components/ReviewToolbar";
import SuggestionCard from "@/components/SuggestionCard";
import { useReviewStore, type ReviewStatus } from "@/lib/store/review";
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
  const setStatus = useReviewStore((s) => s.setStatus);
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
  const [focusIndex, setFocusIndex] = useState(0);

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

  const sourceTextByPath = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parsed) m.set(p.entry.path, p.source);
    return m;
  }, [parsed]);

  // Keep focusIndex inside bounds as visible list changes.
  useEffect(() => {
    if (focusIndex >= visible.length) setFocusIndex(Math.max(0, visible.length - 1));
  }, [visible.length, focusIndex]);

  const setFocusedStatus = useCallback(
    (status: ReviewStatus) => {
      const target = visible[focusIndex];
      if (target) setStatus(target.id, status);
    },
    [visible, focusIndex, setStatus],
  );

  // Keyboard shortcuts: j/k to navigate, a/r/p to mark.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (visible.length === 0) return;
      switch (e.key) {
        case "j":
          e.preventDefault();
          setFocusIndex((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "k":
          e.preventDefault();
          setFocusIndex((i) => Math.max(0, i - 1));
          break;
        case "a":
          e.preventDefault();
          setFocusedStatus("accepted");
          setFocusIndex((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "r":
          e.preventDefault();
          setFocusedStatus("rejected");
          setFocusIndex((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "p":
          e.preventDefault();
          setFocusedStatus("pending");
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, setFocusedStatus]);

  // Scroll focused card into view.
  useEffect(() => {
    const target = visible[focusIndex];
    if (!target) return;
    const el = document.querySelector(`[data-review-item="${target.id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIndex, visible]);

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

    // Phase 1: plan every edit (read original + compute new content) and write
    // a backup for each. No writes to real notes yet. If any note fails to
    // plan, bail before touching anything.
    type Plan = {
      path: string;
      originalContent: string;
      newContent: string;
      applied: number;
      demoted: number;
      skipped: number;
    };
    const plans: Plan[] = [];
    try {
      for (const [path, accepted] of bySource.entries()) {
        const entry = parsed.find((p) => p.entry.path === path)?.entry;
        if (!entry) continue;
        const current = await readNoteBytes(vault, path);
        await writeBackup(backupDir, path, current);
        const result = applySuggestions(entry, current, accepted, {
          seeAlsoHeader: settings.seeAlsoHeader,
        });
        plans.push({
          path,
          originalContent: current,
          newContent: result.content,
          applied: result.applied,
          demoted: result.demoted,
          skipped: result.skipped,
        });
      }
    } catch (e) {
      setError(`계획 단계 실패 (보관함은 그대로): ${(e as Error).message}`);
      setApplying(false);
      return;
    }

    // Phase 2: write each planned change, tracking completed writes so we can
    // roll everything back if one write fails mid-batch.
    const written: Array<{ path: string; previous: string }> = [];
    try {
      for (const p of plans) {
        if (p.newContent === p.originalContent) {
          totals.skipped += p.skipped;
          continue;
        }
        await writeNoteBytes(vault, p.path, p.newContent);
        written.push({ path: p.path, previous: p.originalContent });
        recordUndo({ path: p.path, previous: p.originalContent });
        totals.applied += p.applied;
        totals.demoted += p.demoted;
        totals.skipped += p.skipped;
      }
    } catch (e) {
      // Rollback: restore every file we successfully wrote in this batch.
      const rollbackErrors: string[] = [];
      for (const w of written) {
        try {
          await writeNoteBytes(vault, w.path, w.previous);
        } catch (re) {
          rollbackErrors.push(`${w.path}: ${(re as Error).message}`);
        }
      }
      const base = `적용 중 실패로 배치 롤백함: ${(e as Error).message}`;
      setError(
        rollbackErrors.length > 0
          ? `${base} (롤백 중 일부 오류: ${rollbackErrors.join("; ")})`
          : base,
      );
      setApplying(false);
      return;
    }

    setStats(totals);
    setApplying(false);
  }

  async function undoAll() {
    if (!vault) {
      setError("보관함 연결이 풀렸습니다.");
      return;
    }
    setError(null);
    const failures: string[] = [];
    for (const entry of undoLog) {
      try {
        await writeNoteBytes(vault, entry.path, entry.previous);
      } catch (e) {
        failures.push(`${entry.path}: ${(e as Error).message}`);
      }
    }
    if (failures.length === 0) {
      clearUndo();
    } else {
      setError(
        `Undo 중 ${failures.length}개 파일 복원 실패 — ${failures.join("; ")}`,
      );
      // Keep the undo log so the user can retry.
    }
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

      {visible.length > 0 && (
        <p className="text-xs text-neutral-500">
          키보드: <kbd className="rounded border px-1">j</kbd>/
          <kbd className="rounded border px-1">k</kbd> 이동 ·{" "}
          <kbd className="rounded border px-1">a</kbd> 수락 ·{" "}
          <kbd className="rounded border px-1">r</kbd> 거절 ·{" "}
          <kbd className="rounded border px-1">p</kbd> 보류
        </p>
      )}

      {undoLog.length > 0 && (
        <p className="text-xs text-neutral-500">
          원본은 보관함 내 <code>.auto-linker-backup/</code> 폴더에 보관됩니다.
          디스크 용량이 걱정되면 주기적으로 오래된 타임스탬프 폴더를
          수동으로 정리해 주세요.
        </p>
      )}

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
              <SuggestionCard
                key={it.id}
                item={it}
                sourceText={sourceTextByPath.get(it.sourcePath)}
                focused={visible[focusIndex]?.id === it.id}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
