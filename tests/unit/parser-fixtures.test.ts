import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parseNote, overlapsProtected } from "@/lib/vault/parser";
import type { NoteEntry } from "@/lib/vault/types";

function entry(path: string): NoteEntry {
  return { path, title: "", aliases: [], hash: "h", size: 0 };
}

function loadFixtureDir(dirName: string) {
  const dir = join(__dirname, "../../fixtures", dirName);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => ({
    filename: f,
    source: readFileSync(join(dir, f), "utf-8"),
  }));
}

describe("parser — fixture vault-ko integration", () => {
  const notes = loadFixtureDir("vault-ko");

  it("parses all vault-ko notes without throwing", () => {
    for (const n of notes) {
      expect(() => parseNote(entry(n.filename), n.source)).not.toThrow();
    }
  });

  it("extracts aliases from frontmatter", () => {
    const hookNote = notes.find((n) => n.filename === "리액트-훅.md");
    expect(hookNote).toBeDefined();
    const parsed = parseNote(entry(hookNote!.filename), hookNote!.source);
    expect(parsed.entry.aliases).toContain("리액트 훅");
    expect(parsed.entry.aliases).toContain("react-hooks");
  });

  it("protects code fences in all notes that have them", () => {
    for (const n of notes) {
      if (!n.source.includes("```")) continue;
      const parsed = parseNote(entry(n.filename), n.source);
      const fences = parsed.protectedRanges.filter(
        (r) => r.kind === "code-fence",
      );
      expect(fences.length).toBeGreaterThan(0);
    }
  });

  it("protects math blocks when present", () => {
    const tsNote = notes.find((n) => n.filename === "타입스크립트-팁.md");
    if (!tsNote) return; // Skip if fixture not found
    const parsed = parseNote(entry(tsNote.filename), tsNote.source);
    expect(
      parsed.protectedRanges.some((r) => r.kind === "math-block"),
    ).toBe(true);
  });

  it("extracts existing wikilinks", () => {
    const dailyNote = notes.find((n) => n.filename === "일기-2024-01-10.md");
    if (!dailyNote) return;
    const parsed = parseNote(entry(dailyNote.filename), dailyNote.source);
    expect(parsed.existingLinks.has("성능최적화")).toBe(true);
  });

  it("detects callout headers", () => {
    for (const n of notes) {
      if (!n.source.includes("> [!")) continue;
      const parsed = parseNote(entry(n.filename), n.source);
      expect(
        parsed.protectedRanges.some((r) => r.kind === "callout-header"),
      ).toBe(true);
    }
  });
});

describe("parser — fixture vault-mixed integration", () => {
  const notes = loadFixtureDir("vault-mixed");

  it("parses all vault-mixed notes without throwing", () => {
    for (const n of notes) {
      expect(() => parseNote(entry(n.filename), n.source)).not.toThrow();
    }
  });

  it("every note produces a non-empty title", () => {
    for (const n of notes) {
      const parsed = parseNote(entry(n.filename), n.source);
      expect(parsed.entry.title.length).toBeGreaterThan(0);
    }
  });

  it("every note produces a non-empty summary", () => {
    for (const n of notes) {
      const parsed = parseNote(entry(n.filename), n.source);
      expect(parsed.summary.length).toBeGreaterThan(0);
    }
  });

  it("detects existing wikilinks in notes that have them", () => {
    // 일기-2024-03-15.md should link to React Hooks and TypeScript Basics
    const daily = notes.find((n) => n.filename === "일기-2024-03-15.md");
    if (!daily) return;
    const parsed = parseNote(entry(daily.filename), daily.source);
    expect(parsed.existingLinks.size).toBeGreaterThan(0);
  });

  it("알고리즘-정리 has math blocks protected", () => {
    const algoNote = notes.find((n) => n.filename === "알고리즘-정리.md");
    if (!algoNote) return;
    const parsed = parseNote(entry(algoNote.filename), algoNote.source);
    const mathBlocks = parsed.protectedRanges.filter(
      (r) => r.kind === "math-block" || r.kind === "inline-math",
    );
    expect(mathBlocks.length).toBeGreaterThan(0);
  });

  it("protected ranges never overlap unprotected text incorrectly", () => {
    for (const n of notes) {
      const parsed = parseNote(entry(n.filename), n.source);
      // Ranges should be sorted and non-overlapping after merge
      for (let i = 1; i < parsed.protectedRanges.length; i++) {
        const prev = parsed.protectedRanges[i - 1];
        const curr = parsed.protectedRanges[i];
        expect(curr.start).toBeGreaterThanOrEqual(prev.end);
      }
    }
  });

  it("produces chunks for notes with multiple headings", () => {
    for (const n of notes) {
      const parsed = parseNote(entry(n.filename), n.source);
      if (parsed.headings.filter((h) => h.depth >= 2).length >= 2) {
        expect(parsed.chunks.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
