import { describe, it, expect } from "vitest";
import { createMatcher, parseIgnoreFile } from "@/lib/vault/ignore";

describe("ignore matcher", () => {
  it("applies default excludes regardless of user patterns", () => {
    const m = createMatcher([]);
    expect(m.shouldIgnore(".obsidian/workspace")).toBe(true);
    expect(m.shouldIgnore(".trash/deleted.md")).toBe(true);
    expect(m.shouldIgnore("Templates/daily.md")).toBe(true);
    expect(m.shouldIgnore(".auto-linker-backup/2025-01-01/x.bak")).toBe(true);
    expect(m.shouldIgnore("real/note.md")).toBe(false);
  });

  it("supports ** glob", () => {
    const m = createMatcher(["drafts/**"]);
    expect(m.shouldIgnore("drafts/2024/foo.md")).toBe(true);
    expect(m.shouldIgnore("drafts/foo.md")).toBe(true);
    expect(m.shouldIgnore("published/drafts-old.md")).toBe(false);
  });

  it("parses ignore files stripping comments and blanks", () => {
    const patterns = parseIgnoreFile(`
# a comment
Templates/**

secret/*.md
`);
    expect(patterns).toEqual(["Templates/**", "secret/*.md"]);
  });

  it("supports single-segment * glob", () => {
    const m = createMatcher(["secret/*.md"]);
    expect(m.shouldIgnore("secret/keys.md")).toBe(true);
    expect(m.shouldIgnore("secret/nested/deep.md")).toBe(false);
  });
});
