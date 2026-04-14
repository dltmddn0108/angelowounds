"use client";

import type { ReviewItem } from "@/lib/store/review";

interface Props {
  item: ReviewItem;
  /** Optional source text of the note; used to show surrounding context. */
  sourceText?: string;
}

/** Extract ~40 chars of context on either side of the span. */
function extractContext(
  source: string,
  span: string,
): { before: string; after: string } | null {
  if (!span) return null;
  const idx = source.indexOf(span);
  if (idx === -1) return null;
  const beforeStart = Math.max(0, idx - 40);
  const afterEnd = Math.min(source.length, idx + span.length + 40);
  const before = (beforeStart > 0 ? "…" : "") + source.slice(beforeStart, idx);
  const after =
    source.slice(idx + span.length, afterEnd) +
    (afterEnd < source.length ? "…" : "");
  // Collapse multi-line context to a single line for compact display.
  return {
    before: before.replace(/\s+/g, " "),
    after: after.replace(/\s+/g, " "),
  };
}

/**
 * Render a minimal "before/after" preview for a single suggestion.
 * For inline mode we highlight the span being replaced. For see_also
 * we show the bullet that will be appended.
 */
export default function DiffHunk({ item, sourceText }: Props) {
  if (item.insertionMode === "inline" && item.targetSpan) {
    const target = stripMd(item.targetPath);
    const link =
      item.anchorText === target
        ? `[[${target}]]`
        : `[[${target}|${item.anchorText}]]`;
    const ctx = sourceText ? extractContext(sourceText, item.targetSpan) : null;
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-neutral-100 p-2 font-mono text-xs dark:bg-neutral-800">
        {ctx && <span className="text-neutral-500">{ctx.before}</span>}
        <span className="text-red-600 line-through">{item.targetSpan}</span>
        {ctx && <span className="text-neutral-500">{ctx.after}</span>}
        {"\n→ "}
        {ctx && <span className="text-neutral-500">{ctx.before}</span>}
        <span className="text-emerald-600">{link}</span>
        {ctx && <span className="text-neutral-500">{ctx.after}</span>}
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
