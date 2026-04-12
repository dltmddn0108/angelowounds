import { describe, it, expect } from "vitest";
import { approxTokens, estimateCost } from "@/lib/ai/cost";
import type { ParsedNote } from "@/lib/vault/types";
import type { CandidateSet } from "@/lib/ai/candidates";

function makeNote(path: string, summary: string): ParsedNote {
  return {
    entry: { path, title: path, aliases: [], hash: "h", size: 0 },
    source: "",
    summary,
    headings: [],
    existingLinks: new Set(),
    chunks: [],
    protectedRanges: [],
  };
}

describe("cost estimation", () => {
  it("approxTokens is monotonic in input length", () => {
    expect(approxTokens("")).toBe(0);
    expect(approxTokens("hello world")).toBeGreaterThan(0);
    expect(approxTokens("hello world hello world")).toBeGreaterThan(
      approxTokens("hello world"),
    );
  });

  it("estimate returns sensible numbers for a small vault", () => {
    const notes: ParsedNote[] = [
      makeNote("a.md", "first note about React hooks"),
      makeNote("b.md", "second note about state management"),
      makeNote("c.md", "third note about performance"),
    ];
    const candidates: CandidateSet[] = notes.map((n) => ({
      sourcePath: n.entry.path,
      candidates: notes
        .filter((o) => o.entry.path !== n.entry.path)
        .map((o) => ({ targetPath: o.entry.path, score: 0.5 })),
    }));
    const est = estimateCost(notes, candidates, {
      model: "claude-sonnet-4-5-20250514",
      batchSize: 2,
      topK: 20,
    });
    expect(est.notes).toBe(3);
    expect(est.batches).toBe(2);
    expect(est.estimatedInputTokens).toBeGreaterThan(0);
    expect(est.estimatedUsd).toBeGreaterThanOrEqual(0);
  });

  it("handles unknown model by falling back gracefully", () => {
    const notes = [makeNote("a.md", "x")];
    const cands: CandidateSet[] = [{ sourcePath: "a.md", candidates: [] }];
    const est = estimateCost(notes, cands, {
      model: "nonexistent-model",
      batchSize: 1,
      topK: 5,
    });
    expect(est.estimatedUsd).toBeGreaterThanOrEqual(0);
  });
});
