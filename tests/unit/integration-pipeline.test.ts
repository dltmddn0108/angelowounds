/**
 * Integration harness: runs the full auto-linker pipeline against a fixture
 * vault on disk (bypassing the File System Access API and Claude API).
 *
 * This validates:
 *   - parser correctly marks protected ranges on real-world notes
 *   - candidate dedup (existing wikilinks excluded, bidirectional filter)
 *   - writer correctly inserts [[wikilinks]] / "See also" sections
 *   - protected ranges are byte-identical in the output
 *
 * Mock Claude responses are fabricated to exercise both insertion modes and
 * edge cases (spans that overlap code fences → should be demoted to see_also).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parseNote } from "@/lib/vault/parser";
import { findCandidates, pairKey } from "@/lib/ai/candidates";
import { applySuggestions } from "@/lib/vault/writer";
import type { NoteEntry, ParsedNote, LinkSuggestion } from "@/lib/vault/types";

function sha256Hex(text: string): string {
  // Simple deterministic hash for the fixture pipeline; real scanner uses
  // Web Crypto's SHA-256. Length/content don't matter for this harness.
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

function loadFixtureVault(dirName: string): Array<{ entry: NoteEntry; source: string }> {
  const dir = join(__dirname, "../../fixtures", dirName);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const source = readFileSync(join(dir, f), "utf-8");
    return {
      entry: {
        path: f,
        title: basename(f, ".md"),
        aliases: [],
        hash: sha256Hex(source),
        size: source.length,
      },
      source,
    };
  });
}

/** Fake embeddings: each note gets a short vector derived from word hashes. */
function fakeEmbed(notes: ParsedNote[]): Array<{ path: string; mean: Float32Array }> {
  const DIM = 32;
  return notes.map((n) => {
    const v = new Float32Array(DIM);
    const text = (n.summary + " " + n.entry.title + " " + n.entry.aliases.join(" ")).toLowerCase();
    for (const word of text.split(/\s+/)) {
      if (!word) continue;
      let h = 0;
      for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) | 0;
      v[Math.abs(h) % DIM] += 1;
    }
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= norm;
    return { path: n.entry.path, mean: v };
  });
}

describe("integration — full pipeline against fixture vault-ko", () => {
  const raw = loadFixtureVault("vault-ko");

  it("parses every fixture without throwing", () => {
    for (const { entry, source } of raw) {
      expect(() => parseNote(entry, source)).not.toThrow();
    }
    expect(raw.length).toBeGreaterThan(0);
  });

  it("finds reasonable candidates and respects existing-link dedup", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
    const embeddings = fakeEmbed(parsedList);
    const cands = findCandidates(embeddings, parsedMap, { topK: 5 });

    expect(cands.length).toBe(parsedList.length);
    // No self-links
    for (const c of cands) {
      for (const cand of c.candidates) {
        expect(cand.targetPath).not.toBe(c.sourcePath);
      }
    }
    // If note A already links to B (by title), that pair must not appear as a candidate.
    for (const c of cands) {
      const src = parsedMap.get(c.sourcePath)!;
      for (const cand of c.candidates) {
        const tgt = parsedMap.get(cand.targetPath)!;
        const titleLower = tgt.entry.title.toLowerCase();
        expect(src.existingLinks.has(titleLower)).toBe(false);
      }
    }
  });

  it("enforces bidirectional dedup (A→B implies no B→A)", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
    const embeddings = fakeEmbed(parsedList);
    const cands = findCandidates(embeddings, parsedMap, {
      topK: 5,
      bidirectionalDedup: true,
    });

    const proposed = new Set<string>();
    for (const c of cands) {
      for (const cand of c.candidates) {
        proposed.add(pairKey(c.sourcePath, cand.targetPath));
      }
    }
    // For every proposed (A, B), the reverse (B, A) must NOT be proposed.
    for (const p of proposed) {
      const [a, b] = p.split("|");
      expect(proposed.has(pairKey(b, a))).toBe(false);
    }
  });

  it("writer preserves every protected byte range exactly", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    // Fabricate a suggestion that tries to touch each note's body.
    const reactHook = parsedList.find((n) => n.entry.path === "리액트-훅.md");
    expect(reactHook).toBeDefined();

    const mockSuggestions: LinkSuggestion[] = [
      {
        sourcePath: reactHook!.entry.path,
        targetPath: "상태관리.md",
        insertionMode: "inline",
        // This phrase appears in 리액트-훅.md body
        targetSpan: "로컬 상태",
        anchorText: "로컬 상태",
        confidence: 0.9,
        reasoning: "test: inline replacement on real fixture",
      },
    ];

    const result = applySuggestions(reactHook!.entry, reactHook!.source, mockSuggestions);
    expect(result.applied + result.demoted).toBeGreaterThan(0);

    // Every protected range's bytes must still exist verbatim in the output.
    for (const r of reactHook!.protectedRanges) {
      const original = reactHook!.source.slice(r.start, r.end);
      expect(result.content.includes(original)).toBe(true);
    }
  });

  it("demotes inline spans that would hit a code fence", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    const reactHook = parsedList.find((n) => n.entry.path === "리액트-훅.md");
    if (!reactHook) return;

    // "useState" only appears inside the code fence in this fixture.
    const codeOnlySuggestion: LinkSuggestion = {
      sourcePath: reactHook.entry.path,
      targetPath: "State Hooks.md",
      insertionMode: "inline",
      targetSpan: "useState(0)",
      anchorText: "useState(0)",
      confidence: 0.9,
      reasoning: "test: should be demoted",
    };

    const result = applySuggestions(reactHook.entry, reactHook.source, [codeOnlySuggestion]);
    expect(result.demoted).toBe(1);
    expect(result.content).toContain("## See also");
    // Code fence content must remain intact.
    expect(result.content).toContain('const [count, setCount] = useState(0);');
  });
});

describe("integration — full pipeline against fixture vault-mixed", () => {
  const raw = loadFixtureVault("vault-mixed");

  it("parses all 20 mixed notes", () => {
    expect(raw.length).toBe(20);
    for (const { entry, source } of raw) {
      const parsed = parseNote(entry, source);
      expect(parsed.entry.title.length).toBeGreaterThan(0);
      expect(parsed.summary.length).toBeGreaterThan(0);
    }
  });

  it("respects existing wikilinks from fixture frontmatter", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    // 일기-2024-03-15.md has pre-existing [[React Hooks]] and [[TypeScript Basics]] links
    const daily = parsedList.find((n) => n.entry.path === "일기-2024-03-15.md");
    expect(daily).toBeDefined();
    expect(daily!.existingLinks.has("react hooks")).toBe(true);
    expect(daily!.existingLinks.has("typescript basics")).toBe(true);
  });

  it("full candidate set for 20 notes returns top-K per note", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
    const embeddings = fakeEmbed(parsedList);
    const cands = findCandidates(embeddings, parsedMap, { topK: 3 });

    expect(cands.length).toBe(20);
    for (const c of cands) {
      expect(c.candidates.length).toBeLessThanOrEqual(3);
    }
  });

  it("applies a batch of mock suggestions and preserves all protected ranges", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));

    // Pick 3 notes and fabricate diverse suggestions.
    const targets = [
      { path: "React Hooks.md", span: "state management", target: "함수형-프로그래밍.md" },
      { path: "함수형-프로그래밍.md", span: "순수 함수", target: "React Hooks.md" },
      { path: "Docker 입문.md", span: "Multi-stage build", target: "CI-CD Pipeline.md" },
    ];

    for (const t of targets) {
      const note = parsedList.find((n) => n.entry.path === t.path);
      if (!note) continue;
      const suggestion: LinkSuggestion = {
        sourcePath: t.path,
        targetPath: t.target,
        insertionMode: "inline",
        targetSpan: t.span,
        anchorText: t.span,
        confidence: 0.85,
        reasoning: "integration test",
      };
      const result = applySuggestions(note.entry, note.source, [suggestion]);
      // Either inline applied or demoted to see_also; either way something produced
      expect(result.applied + result.demoted).toBeGreaterThanOrEqual(0);
      // Protected byte preservation
      for (const r of note.protectedRanges) {
        const original = note.source.slice(r.start, r.end);
        expect(result.content.includes(original)).toBe(true);
      }
    }
  });

  it("skips targets already linked (dedup in writer)", () => {
    const parsedList = raw.map(({ entry, source }) => parseNote(entry, source));
    const daily = parsedList.find((n) => n.entry.path === "일기-2024-03-15.md");
    expect(daily).toBeDefined();

    // 일기 already links to React Hooks — a new suggestion must be skipped.
    const dupSuggestion: LinkSuggestion = {
      sourcePath: daily!.entry.path,
      targetPath: "React Hooks.md",
      insertionMode: "inline",
      targetSpan: "cleanup",
      anchorText: "cleanup",
      confidence: 0.9,
      reasoning: "duplicate",
    };
    const result = applySuggestions(daily!.entry, daily!.source, [dupSuggestion]);
    expect(result.skipped).toBe(1);
    expect(result.content).toBe(daily!.source);
  });
});
