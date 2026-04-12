"use client";

import { useReviewStore } from "@/lib/store/review";

interface Props {
  onApply: () => void;
  onUndoAll: () => void;
  applying: boolean;
  applied: number;
  demoted: number;
  skipped: number;
}

export default function ReviewToolbar({
  onApply,
  onUndoAll,
  applying,
  applied,
  demoted,
  skipped,
}: Props) {
  const items = useReviewStore((s) => s.items);
  const floor = useReviewStore((s) => s.confidenceFloor);
  const setFloor = useReviewStore((s) => s.setConfidenceFloor);
  const undoLog = useReviewStore((s) => s.undoLog);

  const accepted = items.filter((i) => i.status === "accepted").length;
  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <section className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded border border-neutral-200 bg-white/90 p-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <span className="text-xs text-neutral-500">
        수락 {accepted} · 대기 {pending} · 전체 {items.length}
      </span>
      <label className="flex items-center gap-2 text-xs">
        신뢰도 ≥ {(floor * 100).toFixed(0)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={floor}
          onChange={(e) => setFloor(Number(e.target.value))}
        />
      </label>
      <div className="ml-auto flex gap-2">
        <button
          onClick={onApply}
          disabled={applying || accepted === 0}
          className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {applying ? "적용 중…" : `${accepted}건 보관함에 기록`}
        </button>
        <button
          onClick={onUndoAll}
          disabled={undoLog.length === 0}
          className="rounded border border-red-400 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40 dark:border-red-500/40 dark:text-red-300"
        >
          전체 Undo ({undoLog.length})
        </button>
      </div>
      {(applied > 0 || demoted > 0 || skipped > 0) && (
        <span className="w-full text-xs text-neutral-500">
          마지막 실행: 적용 {applied} · 인라인→see also 강등 {demoted} · 스킵{" "}
          {skipped}
        </span>
      )}
    </section>
  );
}
