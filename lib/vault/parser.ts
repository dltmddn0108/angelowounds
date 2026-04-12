/**
 * Parse an Obsidian-flavored markdown note into a ParsedNote.
 *
 * We don't use a full AST (remark) for the safety-critical step of
 * identifying protected ranges, because the Obsidian syntax set we need
 * to respect (`[[wikilink]]`, `![[embed]]`, `$$math$$`, `%%comment%%`,
 * dataview/templater code fences, callouts) extends far beyond what
 * stock remark understands, and the AST's source positions can drift
 * after normalization.
 *
 * Instead we do a line-aware byte-level scan that walks the source once
 * and records every region that must not be edited. We still extract
 * headings, chunks, and aliases from the same pass.
 */

import matter from "gray-matter";
import type { NoteChunk, ParsedNote, ProtectedRange, NoteEntry } from "./types";

const CODE_FENCE_RE = /^(\s*)(`{3,}|~{3,})/;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const CALLOUT_HEADER_RE = /^\s*>\s*\[![^\]]+\]/;


export function parseNote(entry: NoteEntry, source: string): ParsedNote {
  const protectedRanges: ProtectedRange[] = [];
  const existingLinks = new Set<string>();
  const headings: ParsedNote["headings"] = [];

  // 1. Frontmatter extraction. `gray-matter` returns both the parsed frontmatter
  //    and a `matter` prefix length. We mark the entire matter block as
  //    protected so the writer never touches it.
  const parsed = matter(source);
  const aliases = extractAliases(parsed.data);
  const frontmatterLen = source.length - parsed.content.length;
  if (frontmatterLen > 0) {
    protectedRanges.push({ start: 0, end: frontmatterLen, kind: "frontmatter" });
  }

  // 2. Walk the body line by line, tracking multi-line code fences,
  //    math blocks, and HTML blocks. Within plain lines, scan for inline
  //    wikilinks / embeds / inline code / inline math / templater / comments.
  const body = source;
  let bodyIdx = frontmatterLen;
  let inCodeFence: { marker: string; start: number } | null = null;
  let inMathBlock: { start: number } | null = null;
  let inHtmlBlock: { start: number } | null = null;

  while (bodyIdx < body.length) {
    const lineEnd = nextLineEnd(body, bodyIdx);
    const line = body.slice(bodyIdx, lineEnd);

    if (inCodeFence) {
      if (line.trim().startsWith(inCodeFence.marker.trim())) {
        protectedRanges.push({
          start: inCodeFence.start,
          end: lineEnd,
          kind: "code-fence",
        });
        inCodeFence = null;
      }
    } else if (inMathBlock) {
      if (line.includes("$$")) {
        protectedRanges.push({
          start: inMathBlock.start,
          end: lineEnd,
          kind: "math-block",
        });
        inMathBlock = null;
      }
    } else if (inHtmlBlock) {
      if (/<\/\w+\s*>/.test(line) || line.trim().length === 0) {
        protectedRanges.push({
          start: inHtmlBlock.start,
          end: lineEnd,
          kind: "html",
        });
        inHtmlBlock = null;
      }
    } else {
      // Try to open a code fence.
      const fence = line.match(CODE_FENCE_RE);
      if (fence) {
        inCodeFence = { marker: fence[2], start: bodyIdx };
      } else if (/^\s*\$\$\s*$/.test(line)) {
        inMathBlock = { start: bodyIdx };
      } else if (/^\s*<\w+[^>]*>\s*$/.test(line) && !/<\/\w+>/.test(line)) {
        inHtmlBlock = { start: bodyIdx };
      } else {
        // Headings
        const h = line.match(HEADING_RE);
        if (h) {
          headings.push({
            depth: h[1].length,
            text: h[2],
            offset: bodyIdx,
          });
        }
        // Callout header — the `> [!type] title` line is protected, but the
        // following `>` body lines are normal text.
        if (CALLOUT_HEADER_RE.test(line)) {
          protectedRanges.push({
            start: bodyIdx,
            end: lineEnd,
            kind: "callout-header",
          });
        }
        // Inline scans for this line.
        scanInline(body, bodyIdx, lineEnd, protectedRanges, existingLinks);
      }
    }

    bodyIdx = lineEnd;
  }
  // Close any unterminated block as protected to the end of file.
  if (inCodeFence) {
    protectedRanges.push({
      start: inCodeFence.start,
      end: body.length,
      kind: "code-fence",
    });
  }
  if (inMathBlock) {
    protectedRanges.push({
      start: inMathBlock.start,
      end: body.length,
      kind: "math-block",
    });
  }

  // 3. Derive title.
  const title = deriveTitle(headings, entry.path);

  // 4. Summary for the vault glossary.
  const summary = buildSummary(body, frontmatterLen, headings, protectedRanges);

  // 5. Build semantic chunks.
  const chunks = buildChunks(body, headings, protectedRanges, frontmatterLen);

  return {
    entry: { ...entry, title, aliases },
    source,
    summary,
    headings,
    existingLinks,
    chunks,
    protectedRanges: mergeRanges(protectedRanges),
  };
}

// ---------- helpers ----------

function nextLineEnd(text: string, start: number): number {
  const nl = text.indexOf("\n", start);
  return nl === -1 ? text.length : nl + 1;
}

function extractAliases(data: Record<string, unknown>): string[] {
  const raw = data.aliases ?? data.alias;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string");
  if (typeof raw === "string") return [raw];
  return [];
}

function scanInline(
  source: string,
  lineStart: number,
  lineEnd: number,
  out: ProtectedRange[],
  existingLinks: Set<string>,
): void {
  let i = lineStart;
  while (i < lineEnd) {
    const ch = source[i];

    // Wikilink or embed: `[[...]]` or `![[...]]`
    if (
      (ch === "[" && source[i + 1] === "[") ||
      (ch === "!" && source[i + 1] === "[" && source[i + 2] === "[")
    ) {
      const isEmbed = ch === "!";
      const openStart = i;
      const searchStart = isEmbed ? i + 3 : i + 2;
      const close = source.indexOf("]]", searchStart);
      if (close !== -1 && close < lineEnd) {
        const end = close + 2;
        out.push({
          start: openStart,
          end,
          kind: isEmbed ? "embed" : "wikilink",
        });
        const inner = source.slice(searchStart, close);
        const targetPart = inner.split("|")[0].split("#")[0].trim();
        if (targetPart) existingLinks.add(normalizeTarget(targetPart));
        i = end;
        continue;
      }
    }

    // Inline code: `...`
    if (ch === "`") {
      const close = source.indexOf("`", i + 1);
      if (close !== -1 && close < lineEnd) {
        out.push({ start: i, end: close + 1, kind: "inline-code" });
        i = close + 1;
        continue;
      }
    }

    // Inline math: $...$ (but not $$)
    if (ch === "$" && source[i + 1] !== "$") {
      const close = source.indexOf("$", i + 1);
      if (close !== -1 && close < lineEnd) {
        out.push({ start: i, end: close + 1, kind: "inline-math" });
        i = close + 1;
        continue;
      }
    }

    // Templater: <% ... %>
    if (ch === "<" && source[i + 1] === "%") {
      const close = source.indexOf("%>", i + 2);
      if (close !== -1) {
        out.push({ start: i, end: close + 2, kind: "templater" });
        i = close + 2;
        continue;
      }
    }

    // Obsidian comment: %% ... %%
    if (ch === "%" && source[i + 1] === "%") {
      const close = source.indexOf("%%", i + 2);
      if (close !== -1) {
        out.push({ start: i, end: close + 2, kind: "comment" });
        i = close + 2;
        continue;
      }
    }

    i += 1;
  }
}

function normalizeTarget(raw: string): string {
  // Strip file extension and leading folder components for loose matching.
  return raw.replace(/\.md$/i, "").toLowerCase();
}

function deriveTitle(
  headings: ParsedNote["headings"],
  path: string,
): string {
  const h1 = headings.find((h) => h.depth === 1);
  if (h1) return h1.text.trim();
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/i, "");
}

function buildSummary(
  body: string,
  bodyStart: number,
  headings: ParsedNote["headings"],
  protectedRanges: ProtectedRange[],
): string {
  // Start after any leading H1 + blank line if present.
  let start = bodyStart;
  const firstH1 = headings.find((h) => h.depth === 1);
  if (firstH1) {
    const eol = body.indexOf("\n", firstH1.offset);
    start = eol === -1 ? body.length : eol + 1;
  }
  // Take up to 600 raw chars, then strip markdown cruft and protected regions.
  const raw = body.slice(start, start + 600);
  const cleaned = raw
    .replace(/`[^`]*`/g, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, p, a) => a ?? p)
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/[#*_>~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  void protectedRanges;
  return cleaned.slice(0, 200);
}

function buildChunks(
  body: string,
  headings: ParsedNote["headings"],
  protectedRanges: ProtectedRange[],
  bodyStart: number,
): NoteChunk[] {
  // Split the body on H2/H3 boundaries. Each chunk is (headingPath, text).
  const boundaries: { offset: number; depth: number; text: string }[] = [
    { offset: bodyStart, depth: 0, text: "" },
    ...headings
      .filter((h) => h.depth === 2 || h.depth === 3)
      .map((h) => ({ offset: h.offset, depth: h.depth, text: h.text })),
    { offset: body.length, depth: 0, text: "" },
  ];
  boundaries.sort((a, b) => a.offset - b.offset);

  const chunks: NoteChunk[] = [];
  const pathStack: { depth: number; text: string }[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const b = boundaries[i];
    if (b.depth > 0) {
      while (pathStack.length && pathStack[pathStack.length - 1].depth >= b.depth) {
        pathStack.pop();
      }
      pathStack.push({ depth: b.depth, text: b.text });
    }
    const slice = body.slice(b.offset, boundaries[i + 1].offset);
    const cleaned = stripProtected(slice, b.offset, protectedRanges)
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length > 0) {
      chunks.push({
        headingPath: pathStack.map((s) => s.text),
        text: cleaned,
      });
    }
  }
  return chunks;
}

function stripProtected(
  slice: string,
  sliceStart: number,
  protectedRanges: ProtectedRange[],
): string {
  const sliceEnd = sliceStart + slice.length;
  let out = "";
  let cursor = 0;
  for (const r of protectedRanges) {
    if (r.end <= sliceStart || r.start >= sliceEnd) continue;
    const localStart = Math.max(0, r.start - sliceStart);
    const localEnd = Math.min(slice.length, r.end - sliceStart);
    if (localStart > cursor) out += slice.slice(cursor, localStart);
    cursor = localEnd;
  }
  out += slice.slice(cursor);
  return out;
}

function mergeRanges(ranges: ProtectedRange[]): ProtectedRange[] {
  if (ranges.length <= 1) return [...ranges].sort((a, b) => a.start - b.start);
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: ProtectedRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Is the given byte offset inside any protected range? */
export function isProtected(
  offset: number,
  protectedRanges: ProtectedRange[],
): boolean {
  for (const r of protectedRanges) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}

/** Does the given [start, end) span touch any protected range? */
export function overlapsProtected(
  start: number,
  end: number,
  protectedRanges: ProtectedRange[],
): boolean {
  for (const r of protectedRanges) {
    if (start < r.end && end > r.start) return true;
  }
  return false;
}
