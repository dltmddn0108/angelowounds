"use client";

import DiffHunk from "./DiffHunk";
import { useReviewStore, type ReviewItem } from "@/lib/store/review";

interface Props {
  item: ReviewItem;
  sourceText?: string;
  focused?: boolean;
}

export default function SuggestionCard({ item, sourceText, focused }: Props) {
  const setStatus = useReviewStore((s) => s.setStatus);
  const updateAnchor = useReviewStore((s) => s.updateAnchor);

  const statusTone =
    item.status === "accepted"
      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
      : item.status === "rejected"
      ? "border-neutral-300 bg-neutral-100 opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <article
      data-review-item={item.id}
      className={`space-y-2 rounded border p-3 text-sm transition-all duration-300 hover:shadow-md ${statusTone} ${
        focused ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""
      }`}
    >
      <header className="flex items-center gap-2">
        <span className="font-mono text-xs text-neutral-500">
          {item.sourcePath}
        </span>
        <span className="text-neutral-400">→</span>
        <span className="font-mono text-xs">{item.targetPath}</span>
        <span
          className={`ml-auto rounded px-2 py-0.5 text-xs ${
            item.insertionMode === "inline"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
              : "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200"
          }`}
        >
          {item.insertionMode === "inline" ? "인라인" : "참고"}
        </span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
          {(item.confidence * 100).toFixed(0)}%
        </span>
      </header>
      <DiffHunk item={item} sourceText={sourceText} />
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        {item.reasoning}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          anchor
          <input
            type="text"
            value={item.anchorText}
            onChange={(e) => updateAnchor(item.id, e.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
          />
        </label>
        <button
          onClick={() => setStatus(item.id, "accepted")}
          className="ml-auto rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
          disabled={item.status === "accepted"}
        >
          수락
        </button>
        <button
          onClick={() => setStatus(item.id, "rejected")}
          className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
          disabled={item.status === "rejected"}
        >
          거절
        </button>
        <button
          onClick={() => setStatus(item.id, "pending")}
          className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
          disabled={item.status === "pending"}
        >
          보류
        </button>
      </div>
    </article>
  );
}
