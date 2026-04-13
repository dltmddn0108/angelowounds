import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { applySuggestions } from "@/lib/vault/writer";
import { parseNote } from "@/lib/vault/parser";
import type { LinkSuggestion, NoteEntry } from "@/lib/vault/types";

function entry(path: string): NoteEntry {
  return { path, title: "", aliases: [], hash: "h", size: 0 };
}

const BASE = `---
aliases: [alias1]
---

# 제목

이 문장은 리액트 훅을 소개합니다.

\`\`\`ts
const link = "[[Inside Code]]";
\`\`\`

$$
x = 1
$$

> [!info] 콜아웃 헤더는 건드리면 안 된다
> 본문은 괜찮다.

%% 주석 영역 %%
`;

describe("applySuggestions — safety", () => {
  it("performs an inline replacement when the span is found", () => {
    const suggestion: LinkSuggestion = {
      sourcePath: "src.md",
      targetPath: "리액트-훅.md",
      insertionMode: "inline",
      targetSpan: "리액트 훅",
      anchorText: "리액트 훅",
      confidence: 0.9,
      reasoning: "test",
    };
    const result = applySuggestions(entry("src.md"), BASE, [suggestion]);
    expect(result.applied).toBe(1);
    expect(result.content).toContain("[[리액트-훅|리액트 훅]]");
    // Code fence untouched.
    expect(result.content).toContain('const link = "[[Inside Code]]"');
    // Math block untouched.
    expect(result.content).toContain("x = 1");
    // Callout header untouched.
    expect(result.content).toContain("[!info] 콜아웃 헤더는 건드리면 안 된다");
  });

  it("demotes to see_also when the inline span is inside a protected range", () => {
    const suggestion: LinkSuggestion = {
      sourcePath: "src.md",
      targetPath: "Inside Code.md",
      insertionMode: "inline",
      // This substring only appears inside the code fence.
      targetSpan: "Inside Code",
      anchorText: "Inside Code",
      confidence: 0.9,
      reasoning: "test",
    };
    const result = applySuggestions(entry("src.md"), BASE, [suggestion]);
    expect(result.demoted).toBe(1);
    expect(result.content).toContain("## See also");
    expect(result.content).toContain("- [[Inside Code]]");
    // The original code fence is still intact byte-for-byte.
    expect(result.content).toContain('const link = "[[Inside Code]]"');
  });

  it("appends to an existing See also section instead of creating a new one", () => {
    const src = `# 제목

본문.

## See also
- [[Existing]]
`;
    const suggestion: LinkSuggestion = {
      sourcePath: "s.md",
      targetPath: "New.md",
      insertionMode: "see_also",
      anchorText: "New",
      confidence: 0.9,
      reasoning: "r",
    };
    const result = applySuggestions(entry("s.md"), src, [suggestion]);
    // Exactly one "## See also" heading should remain.
    expect(result.content.match(/^##\s+See also\s*$/gm)?.length).toBe(1);
    expect(result.content).toContain("- [[New]]");
    expect(result.content).toContain("- [[Existing]]");
  });

  it("skips duplicates: never re-links a target that already exists", () => {
    const src = `# 제목

이미 [[Existing Target]]에 링크가 있다.
`;
    const suggestion: LinkSuggestion = {
      sourcePath: "s.md",
      targetPath: "Existing Target.md",
      insertionMode: "inline",
      targetSpan: "이미",
      anchorText: "이미",
      confidence: 0.9,
      reasoning: "r",
    };
    const result = applySuggestions(entry("s.md"), src, [suggestion]);
    expect(result.skipped).toBe(1);
    expect(result.content).toBe(src);
  });

  it("falls through protected match to the next non-protected occurrence", () => {
    const src = `# 제목

\`\`\`ts
// 리액트 훅
const foo = 1;
\`\`\`

본문에서 리액트 훅을 설명합니다.
`;
    const suggestion: LinkSuggestion = {
      sourcePath: "s.md",
      targetPath: "리액트-훅.md",
      insertionMode: "inline",
      targetSpan: "리액트 훅",
      anchorText: "리액트 훅",
      confidence: 0.9,
      reasoning: "test",
    };
    const result = applySuggestions(entry("s.md"), src, [suggestion]);
    expect(result.applied).toBe(1);
    expect(result.demoted).toBe(0);
    expect(result.content).toContain("// 리액트 훅");
    expect(result.content).toContain("[[리액트-훅|리액트 훅]]을 설명합니다");
  });

  it("demotes to see_also only when every occurrence is inside protected ranges", () => {
    const src = `# 제목

\`\`\`ts
const x = useState(0);
\`\`\`

본문.
`;
    const suggestion: LinkSuggestion = {
      sourcePath: "s.md",
      targetPath: "State.md",
      insertionMode: "inline",
      targetSpan: "useState",
      anchorText: "useState",
      confidence: 0.9,
      reasoning: "test",
    };
    const result = applySuggestions(entry("s.md"), src, [suggestion]);
    expect(result.demoted).toBe(1);
    expect(result.content).toContain("## See also");
    expect(result.content).toContain("const x = useState(0);");
  });

  it("property: protected ranges are never modified for arbitrary inline spans", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 15 }),
        (span, anchor) => {
          const s: LinkSuggestion = {
            sourcePath: "s.md",
            targetPath: "T.md",
            insertionMode: "inline",
            targetSpan: span,
            anchorText: anchor,
            confidence: 0.9,
            reasoning: "r",
          };
          const before = parseNote(entry("s.md"), BASE);
          const result = applySuggestions(entry("s.md"), BASE, [s]);
          // Every protected range's bytes must be unchanged.
          for (const r of before.protectedRanges) {
            const original = BASE.slice(r.start, r.end);
            // The original slice must still appear in the new content.
            expect(result.content).toContain(original);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
