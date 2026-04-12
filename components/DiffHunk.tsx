"use client";

import type { ReviewItem } from "@/lib/store/review";

interface Props {
  item: ReviewItem;
}

/**
 * Render a minimal "before/after" preview for a single suggestion.
 * For inline mode we highlight the span being replaced. For see_also
 * we show the bullet that will be appended.
 */
export default function DiffHunk({ item }: Props) {
  if (item.insertionMode === "inline" && item.targetSpan) {
    const target = stripMd(item.targetPath);
    const link =
      item.anchorText === target
        ? `[[${target}]]`
        : `[[${target}|${item.anchorText}]]`;
    return (
      <pre className="overflow-x-auto rounded bg-neutral-100 p-2 font-mono text-xs dark:bg-neutral-800">
        <span className="text-red-600 line-through">{item.targetSpan}</span>
        {" → "}
        <span className="text-emerald-600">{link}</span>
      </pre>
    );
  }
  const target = stripMd(item.targetPath);
  const bullet =
    item.anchorText && item.anchorText !== target
      ? `- [[${target}|${item.anchorText}]]`
      : `- [[${target}]]`;
  return (
    <pre className="overflow-x-auto rounded bg-neutral-100 p-2 font-mono text-xs dark:bg-neutral-800">
      <span className="text-neutral-500">## See also</span>
      {"\n"}
      <span className="text-emerald-600">{bullet}</span>
    </pre>
  );
}

function stripMd(p: string): string {
  return p.replace(/\.md$/i, "");
}
