/**
 * Apply accepted link suggestions to a note's source text.
 *
 * Two insertion modes:
 *  - `inline`: replace an exact span of text with `[[target|span]]`
 *  - `see_also`: append `- [[target]]` to a `## See also` section
 *
 * All edits are validated against the protected-range mask before being
 * applied. If an inline span cannot be found in the source (or overlaps a
 * protected range) the suggestion is downgraded to `see_also` automatically.
 */

import { parseNote, overlapsProtected } from "./parser";
import type { LinkSuggestion, ParsedNote, NoteEntry } from "./types";

export interface ApplyResult {
  /** The new file content. */
  content: string;
  /** Number of suggestions actually applied. */
  applied: number;
  /** Number of suggestions demoted from inline to see_also. */
  demoted: number;
  /** Number of suggestions skipped entirely (invalid / duplicate). */
  skipped: number;
}

export interface ApplyOptions {
  /** Default header for the fallback section. Defaults to "See also". */
  seeAlsoHeader?: string;
}

export function applySuggestions(
  entry: NoteEntry,
  source: string,
  suggestions: LinkSuggestion[],
  opts: ApplyOptions = {},
): ApplyResult {
  const parsed = parseNote(entry, source);
  const header = opts.seeAlsoHeader ?? "See also";

  // Plan edits first so inline replacements can be applied from the end
  // of the file backwards (preserves offsets of earlier edits).
  type InlineEdit = { start: number; end: number; replacement: string };
  const inlineEdits: InlineEdit[] = [];
  const seeAlsoTargets: string[] = [];
  let applied = 0;
  let demoted = 0;
  let skipped = 0;

  const alreadyLinkedInSource = new Set(parsed.existingLinks);

  for (const s of suggestions) {
    // Skip if we already link to this target.
    const key = normalizeLinkTarget(s.targetPath);
    if (alreadyLinkedInSource.has(key)) {
      skipped += 1;
      continue;
    }

    if (s.insertionMode === "inline" && s.targetSpan) {
      const edit = planInlineEdit(parsed, s.targetSpan, s);
      if (edit) {
        inlineEdits.push(edit);
        alreadyLinkedInSource.add(key);
        applied += 1;
        continue;
      }
      // Demote to see_also.
      demoted += 1;
    }

    // see_also fallback
    seeAlsoTargets.push(formatSeeAlsoItem(s));
    alreadyLinkedInSource.add(key);
    applied += 1;
  }

  // Apply inline edits from right to left.
  inlineEdits.sort((a, b) => b.start - a.start);
  let content = source;
  for (const e of inlineEdits) {
    content = content.slice(0, e.start) + e.replacement + content.slice(e.end);
  }

  // Append see-also block.
  if (seeAlsoTargets.length > 0) {
    content = appendSeeAlsoSection(content, header, seeAlsoTargets);
  }

  return { content, applied, demoted, skipped };
}

function planInlineEdit(
  parsed: ParsedNote,
  span: string,
  s: LinkSuggestion,
): { start: number; end: number; replacement: string } | null {
  if (span.length === 0) return null;
  // Only search body text; never match inside the frontmatter.
  const fmLen = parsed.protectedRanges.find((r) => r.kind === "frontmatter")?.end ?? 0;
  const searchFrom = fmLen;
  const idx = parsed.source.indexOf(span, searchFrom);
  if (idx === -1) return null;
  const end = idx + span.length;
  if (overlapsProtected(idx, end, parsed.protectedRanges)) return null;
  const anchor = s.anchorText && s.anchorText.length > 0 ? s.anchorText : span;
  const target = stripMdExtension(s.targetPath);
  const replacement =
    anchor === target
      ? `[[${target}]]`
      : `[[${target}|${anchor}]]`;
  return { start: idx, end, replacement };
}

function appendSeeAlsoSection(
  content: string,
  header: string,
  targets: string[],
): string {
  const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerRe = new RegExp(`(^|\\n)##\\s+${escapedHeader}\\s*\\n`);
  const m = content.match(headerRe);
  const bullets = targets.join("\n");
  if (m) {
    // Insert bullets immediately after the existing header line.
    const insertAt = (m.index ?? 0) + m[0].length;
    return content.slice(0, insertAt) + bullets + "\n" + content.slice(insertAt);
  }
  const needsLeadingBreak = content.length > 0 && !content.endsWith("\n");
  const lead = needsLeadingBreak ? "\n\n" : content.endsWith("\n\n") ? "" : "\n";
  return content + lead + `## ${header}\n` + bullets + "\n";
}

function formatSeeAlsoItem(s: LinkSuggestion): string {
  const target = stripMdExtension(s.targetPath);
  if (s.anchorText && s.anchorText !== target) {
    return `- [[${target}|${s.anchorText}]]`;
  }
  return `- [[${target}]]`;
}

function stripMdExtension(p: string): string {
  return p.replace(/\.md$/i, "");
}

function normalizeLinkTarget(raw: string): string {
  return stripMdExtension(raw).toLowerCase();
}
