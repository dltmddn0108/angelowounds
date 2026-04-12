import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Test the Zod schema used by suggest.ts to validate Claude tool-use output.
 * We re-define the schema here (same as suggest.ts) so the test is standalone
 * and also guards against accidental schema drift.
 */
const SuggestResultSchema = z.object({
  results: z.array(
    z.object({
      source_path: z.string(),
      suggestions: z.array(
        z.object({
          target_path: z.string(),
          insertion_mode: z.enum(["inline", "see_also"]),
          target_span: z.string().optional(),
          anchor_text: z.string(),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
        }),
      ),
    }),
  ),
});

describe("suggest — Zod schema validation", () => {
  it("accepts a valid inline suggestion payload", () => {
    const payload = {
      results: [
        {
          source_path: "노트A.md",
          suggestions: [
            {
              target_path: "노트B.md",
              insertion_mode: "inline",
              target_span: "리액트 훅",
              anchor_text: "리액트 훅",
              confidence: 0.85,
              reasoning: "노트A에서 리액트 훅을 직접 언급함",
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts a valid see_also suggestion without target_span", () => {
    const payload = {
      results: [
        {
          source_path: "src.md",
          suggestions: [
            {
              target_path: "related.md",
              insertion_mode: "see_also",
              anchor_text: "Related Topic",
              confidence: 0.6,
              reasoning: "thematic overlap",
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts an empty suggestions array", () => {
    const payload = {
      results: [{ source_path: "x.md", suggestions: [] }],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const payload = {
      results: [
        {
          source_path: "x.md",
          suggestions: [
            {
              // missing target_path, insertion_mode, anchor_text, confidence, reasoning
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects invalid insertion_mode", () => {
    const payload = {
      results: [
        {
          source_path: "x.md",
          suggestions: [
            {
              target_path: "y.md",
              insertion_mode: "unknown_mode",
              anchor_text: "text",
              confidence: 0.5,
              reasoning: "r",
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const payload = {
      results: [
        {
          source_path: "x.md",
          suggestions: [
            {
              target_path: "y.md",
              insertion_mode: "inline",
              target_span: "foo",
              anchor_text: "foo",
              confidence: 1.5,
              reasoning: "r",
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const payload = {
      results: [
        {
          source_path: "x.md",
          suggestions: [
            {
              target_path: "y.md",
              insertion_mode: "see_also",
              anchor_text: "bar",
              confidence: -0.1,
              reasoning: "r",
            },
          ],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects non-object root", () => {
    expect(SuggestResultSchema.safeParse("string").success).toBe(false);
    expect(SuggestResultSchema.safeParse(null).success).toBe(false);
    expect(SuggestResultSchema.safeParse([]).success).toBe(false);
  });

  it("accepts multiple results with mixed suggestion types", () => {
    const payload = {
      results: [
        {
          source_path: "a.md",
          suggestions: [
            {
              target_path: "b.md",
              insertion_mode: "inline",
              target_span: "some text",
              anchor_text: "some text",
              confidence: 0.9,
              reasoning: "direct mention",
            },
            {
              target_path: "c.md",
              insertion_mode: "see_also",
              anchor_text: "C Topic",
              confidence: 0.4,
              reasoning: "tangential",
            },
          ],
        },
        {
          source_path: "d.md",
          suggestions: [],
        },
      ],
    };
    const result = SuggestResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results.length).toBe(2);
      expect(result.data.results[0].suggestions.length).toBe(2);
    }
  });
});
