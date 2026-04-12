import { describe, it, expect } from "vitest";
import { parseNote, overlapsProtected } from "@/lib/vault/parser";
import type { NoteEntry } from "@/lib/vault/types";

function entry(path: string): NoteEntry {
  return { path, title: "", aliases: [], hash: "h", size: 0 };
}

describe("parseNote — Obsidian syntax coverage", () => {
  it("marks frontmatter as protected and extracts aliases", () => {
    const src = `---
title: Hello
aliases: [인사, greeting]
---

# Hello

본문입니다.
`;
    const p = parseNote(entry("hello.md"), src);
    expect(p.entry.aliases).toEqual(["인사", "greeting"]);
    const fm = p.protectedRanges.find((r) => r.kind === "frontmatter");
    expect(fm).toBeDefined();
    expect(fm!.start).toBe(0);
    expect(fm!.end).toBeGreaterThan(0);
    // Overlapping the frontmatter must be considered protected.
    expect(overlapsProtected(2, 10, p.protectedRanges)).toBe(true);
  });

  it("protects code fences and never exposes fence contents", () => {
    const src = `text before

\`\`\`ts
const x: number = 1;
const link = "[[not a real link]]";
\`\`\`

text after
`;
    const p = parseNote(entry("code.md"), src);
    const fence = p.protectedRanges.find((r) => r.kind === "code-fence");
    expect(fence).toBeDefined();
    // The wikilink inside the fence must NOT be picked up.
    expect(p.existingLinks.size).toBe(0);
  });

  it("parses wikilink variants and records normalized targets", () => {
    const src = `# Demo

See [[Other]], [[Other|별명]], [[Folder/Deep]], [[Note#Heading]], ![[embed.png]].
`;
    const p = parseNote(entry("demo.md"), src);
    // All four wikilinks + the embed are protected.
    const protectedLinks = p.protectedRanges.filter(
      (r) => r.kind === "wikilink" || r.kind === "embed",
    );
    expect(protectedLinks.length).toBe(5);
    expect(p.existingLinks.has("other")).toBe(true);
    expect(p.existingLinks.has("folder/deep")).toBe(true);
  });

  it("protects block-level and inline math", () => {
    const src = `Inline $a = b$ and:

$$
\\text{LCP} = T
$$

후속 텍스트.
`;
    const p = parseNote(entry("math.md"), src);
    expect(p.protectedRanges.some((r) => r.kind === "inline-math")).toBe(true);
    expect(p.protectedRanges.some((r) => r.kind === "math-block")).toBe(true);
  });

  it("protects templater and obsidian comments", () => {
    const src = `오늘은 <%tp.date.now()%>.

%% 작성자 메모 %%

본문.
`;
    const p = parseNote(entry("meta.md"), src);
    expect(p.protectedRanges.some((r) => r.kind === "templater")).toBe(true);
    expect(p.protectedRanges.some((r) => r.kind === "comment")).toBe(true);
  });

  it("protects callout header but not callout body", () => {
    const src = `> [!info] 제목
> 본문 문장입니다.
`;
    const p = parseNote(entry("callout.md"), src);
    expect(
      p.protectedRanges.some((r) => r.kind === "callout-header"),
    ).toBe(true);
    // The body line is NOT protected.
    const bodyOffset = src.indexOf("본문");
    expect(overlapsProtected(bodyOffset, bodyOffset + 2, p.protectedRanges)).toBe(
      false,
    );
  });

  it("derives title from the first H1", () => {
    const p = parseNote(
      entry("slug.md"),
      "# 멋진 제목\n\n본문\n",
    );
    expect(p.entry.title).toBe("멋진 제목");
  });

  it("falls back to filename when no H1 is present", () => {
    const p = parseNote(entry("folder/제목없음.md"), "본문만 있습니다.\n");
    expect(p.entry.title).toBe("제목없음");
  });

  it("produces a non-empty summary that strips markdown cruft", () => {
    const src = `# 제목

이것은 **강조**된 \`code\`를 포함한 첫 문단입니다. [[링크]]도 있습니다.

두번째 문단은 요약에 안 들어가도 됩니다.
`;
    const p = parseNote(entry("s.md"), src);
    expect(p.summary.length).toBeGreaterThan(0);
    expect(p.summary).not.toContain("**");
    expect(p.summary).not.toContain("`");
  });
});
