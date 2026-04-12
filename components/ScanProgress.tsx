"use client";

interface Props {
  label: string;
  current: number;
  total: number;
  detail?: string;
}

export default function ScanProgress({ label, current, total, detail }: Props) {
  const indeterminate = total === 0;
  const pct = indeterminate ? 0 : Math.min(100, Math.round((current / total) * 100));
  const isActive = !indeterminate && current < total;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-neutral-500">
          {indeterminate ? "준비 중..." : `${current}/${total} (${pct}%)`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-indeterminate rounded bg-neutral-900 dark:bg-neutral-100" />
        ) : (
          <div
            className={`h-full bg-neutral-900 transition-all dark:bg-neutral-100 ${isActive ? "animate-pulse" : ""}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {detail && (
        <p className="truncate font-mono text-xs text-neutral-500">{detail}</p>
      )}
    </div>
  );
}
