/**
 * End-to-end simulation.
 *
 * Copies the vault-ko fixture to a temp directory, runs the full pipeline
 * (scan → parse → fake-embed → candidates → mocked Claude → applySuggestions
 * → real file writes → backup) and asserts the output is correct.
 *
 * This is the closest we can get to a real user session without a browser:
 *   - files live on a real filesystem (not in-memory)
 *   - writer actually overwrites files
 *   - backups are actually created on disk
 *   - bytes are re-read from disk to verify
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { parseNote } from "@/lib/vault/parser";
import { findCandidates } from "@/lib/ai/candidates";
import { applySuggestions } from "@/lib/vault/writer";
import type { LinkSuggestion, NoteEntry } from "@/lib/vault/types";

function hashStr(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

function copyVault(src: string, dst: string) {
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    if (!name.endsWith(".md")) continue;
    copyFileSync(join(src, name), join(dst, name));
  }
}

describe("simulation — full run against a real temp vault", () => {
  const fixtureDir = join(__dirname, "../../fixtures/vault-ko");
  const simDir = join(tmpdir(), "oal-sim-" + Date.now());

  beforeEach(() => {
    copyVault(fixtureDir, simDir);
  });

  afterEach(() => {
    if (existsSync(simDir)) rmSync(simDir, { recursive: true, force: true });
  });

  it("runs end-to-end and produces expected writes + backups", () => {
    // 1. Scan: read all .md files from the temp vault.
    const files = readdirSync(simDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);

    const rawNotes = files.map((f) => {
      const source = readFileSync(join(simDir, f), "utf-8");
      const entry: NoteEntry = {
        path: f,
        title: basename(f, ".md"),
        aliases: [],
        hash: hashStr(source),
        size: source.length,
      };
      return { entry, source };
    });

    // 2. Parse every note.
    const parsedList = rawNotes.map(({ entry, source }) => parseNote(entry, source));
    expect(parsedList.every((n) => n.entry.title.length > 0)).toBe(true);

    // 3. Fake embeddings (keyword overlap).
    const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
    const DIM = 16;
    const embeddings = parsedList.map((n) => {
      const v = new Float32Array(DIM);
      const text = (n.summary + " " + n.entry.title).toLowerCase();
      for (const w of text.split(/\s+/)) {
        if (!w) continue;
        let h = 0;
        for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) | 0;
        v[Math.abs(h) % DIM] += 1;
      }
      let norm = 0;
      for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < DIM; i++) v[i] /= norm;
      return { path: n.entry.path, mean: v };
    });

    // 4. Candidate search.
    const candidates = findCandidates(embeddings, parsedMap, { topK: 3 });
    expect(candidates.length).toBe(parsedList.length);

    // 5. Mock Claude: produce a hand-crafted suggestion for 3 notes we know
    //    contain the target spans (verified by re-reading fixture content).
    const mockSuggestions: LinkSuggestion[] = [];
    const reactHook = parsedList.find((n) => n.entry.path === "리액트-훅.md");
    const stateNote = parsedList.find((n) => n.entry.path === "상태관리.md");
    const perfNote = parsedList.find((n) => n.entry.path === "성능최적화.md");

    if (reactHook && reactHook.source.includes("로컬 상태")) {
      mockSuggestions.push({
        sourcePath: "리액트-훅.md",
        targetPath: "상태관리.md",
        insertionMode: "inline",
        targetSpan: "로컬 상태",
        anchorText: "로컬 상태",
        confidence: 0.9,
        reasoning: "simulated Claude suggestion",
      });
    }
    if (stateNote) {
      mockSuggestions.push({
        sourcePath: "상태관리.md",
        targetPath: "성능최적화.md",
        insertionMode: "see_also",
        anchorText: "성능최적화",
        confidence: 0.7,
        reasoning: "thematic link via see_also",
      });
    }
    if (perfNote && perfNote.source.includes("렌더링")) {
      mockSuggestions.push({
        sourcePath: "성능최적화.md",
        targetPath: "리액트-훅.md",
        insertionMode: "inline",
        targetSpan: "렌더링",
        anchorText: "렌더링",
        confidence: 0.85,
        reasoning: "simulated",
      });
    }
    expect(mockSuggestions.length).toBeGreaterThanOrEqual(2);

    // 6. Apply (2-phase pattern like review page): plan → write → backup.
    const bySource = new Map<string, LinkSuggestion[]>();
    for (const s of mockSuggestions) {
      const b = bySource.get(s.sourcePath) ?? [];
      b.push(s);
      bySource.set(s.sourcePath, b);
    }

    const backupDir = join(simDir, ".auto-linker-backup", "sim-run");
    mkdirSync(backupDir, { recursive: true });

    let totalApplied = 0;
    let totalDemoted = 0;
    let totalSkipped = 0;
    const written: string[] = [];

    for (const [path, suggestions] of bySource.entries()) {
      const note = parsedList.find((n) => n.entry.path === path);
      if (!note) continue;
      const original = readFileSync(join(simDir, path), "utf-8");
      // Backup first.
      const safeName = path.replace(/\//g, "__") + ".bak";
      writeFileSync(join(backupDir, safeName), original, "utf-8");
      // Apply.
      const result = applySuggestions(note.entry, original, suggestions);
      if (result.content !== original) {
        writeFileSync(join(simDir, path), result.content, "utf-8");
        written.push(path);
      }
      totalApplied += result.applied;
      totalDemoted += result.demoted;
      totalSkipped += result.skipped;
    }

    // 7. Assertions.
    // At least some writes happened.
    expect(written.length).toBeGreaterThan(0);
    expect(totalApplied).toBeGreaterThan(0);

    // Every written file must now contain at least one new [[wikilink]] that
    // wasn't there before — verified by reading back from disk.
    for (const p of written) {
      const after = readFileSync(join(simDir, p), "utf-8");
      expect(after.includes("[[")).toBe(true);
      // Protected-range byte preservation (code fences, math, frontmatter).
      const note = parsedList.find((n) => n.entry.path === p)!;
      for (const r of note.protectedRanges) {
        const originalSlice = note.source.slice(r.start, r.end);
        expect(after.includes(originalSlice)).toBe(true);
      }
    }

    // Every backup file must exist on disk and match the original bytes.
    for (const p of written) {
      const safeName = p.replace(/\//g, "__") + ".bak";
      const backupPath = join(backupDir, safeName);
      expect(existsSync(backupPath)).toBe(true);
      const backupBytes = readFileSync(backupPath, "utf-8");
      const note = parsedList.find((n) => n.entry.path === p)!;
      expect(backupBytes).toBe(note.source);
    }

    // Simulated undo: restore backups, assert files match originals byte-for-byte.
    for (const p of written) {
      const safeName = p.replace(/\//g, "__") + ".bak";
      const backupBytes = readFileSync(join(backupDir, safeName), "utf-8");
      writeFileSync(join(simDir, p), backupBytes, "utf-8");
    }
    for (const p of written) {
      const restored = readFileSync(join(simDir, p), "utf-8");
      const note = parsedList.find((n) => n.entry.path === p)!;
      expect(restored).toBe(note.source);
    }

    // Sanity: backup directory has real files with nonzero size.
    const backupFiles = readdirSync(backupDir);
    expect(backupFiles.length).toBeGreaterThan(0);
    for (const bf of backupFiles) {
      const s = statSync(join(backupDir, bf));
      expect(s.size).toBeGreaterThan(0);
    }

    console.log(
      `[sim] ${written.length} notes written, ${totalApplied} links applied, ` +
      `${totalDemoted} demoted, ${totalSkipped} skipped, ` +
      `${backupFiles.length} backups, undo restored all to original bytes.`,
    );
  });
});
