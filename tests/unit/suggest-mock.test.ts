/**
 * End-to-end test of the suggest pipeline with a mocked Anthropic SDK.
 *
 * We mock @anthropic-ai/sdk at the vi module level so `runSuggestionPipeline`
 * can be exercised without a network call. This validates:
 *   - batching of source notes
 *   - cache_control is passed
 *   - Zod validation of tool_use payloads
 *   - maxLinksPerNote enforcement
 *   - resumeFromBatch skips earlier batches
 *   - onCheckpoint fires per batch
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedNote } from "@/lib/vault/types";
import type { CandidateSet } from "@/lib/ai/candidates";

// Mock the Anthropic SDK BEFORE importing the module under test.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = { create: createMock };
      constructor(_opts: unknown) {}
    },
  };
});

// Dynamic import so the mock is in place.
import { runSuggestionPipeline } from "@/lib/ai/suggest";

function makeNote(path: string, summary: string): ParsedNote {
  return {
    entry: { path, title: path.replace(/\.md$/, ""), aliases: [], hash: "h", size: 0 },
    source: "",
    summary,
    headings: [],
    existingLinks: new Set(),
    chunks: [{ headingPath: [], text: summary }],
    protectedRanges: [],
  };
}

function makeMockToolResponse(sourcePath: string, suggestions: Array<{ target: string; mode: "inline" | "see_also"; span?: string; anchor: string }>) {
  return {
    content: [
      {
        type: "tool_use",
        name: "submit_suggestions",
        input: {
          results: [
            {
              source_path: sourcePath,
              suggestions: suggestions.map((s) => ({
                target_path: s.target,
                insertion_mode: s.mode,
                target_span: s.span,
                anchor_text: s.anchor,
                confidence: 0.85,
                reasoning: "mocked",
              })),
            },
          ],
        },
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 80,
      cache_creation_input_tokens: 20,
    },
  };
}

describe("suggest pipeline — mocked Claude", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("runs a single batch and returns parsed suggestions", async () => {
    const notes: ParsedNote[] = [
      makeNote("a.md", "React hooks and state"),
      makeNote("b.md", "Functional programming in JS"),
    ];
    const candidates: CandidateSet[] = [
      { sourcePath: "a.md", candidates: [{ targetPath: "b.md", score: 0.9 }] },
      { sourcePath: "b.md", candidates: [{ targetPath: "a.md", score: 0.9 }] },
    ];

    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "submit_suggestions",
          input: {
            results: [
              {
                source_path: "a.md",
                suggestions: [
                  {
                    target_path: "b.md",
                    insertion_mode: "inline",
                    target_span: "React hooks",
                    anchor_text: "React hooks",
                    confidence: 0.9,
                    reasoning: "direct mention",
                  },
                ],
              },
              {
                source_path: "b.md",
                suggestions: [],
              },
            ],
          },
        },
      ],
      usage: {
        input_tokens: 200,
        output_tokens: 75,
        cache_read_input_tokens: 150,
        cache_creation_input_tokens: 50,
      },
    });

    const result = await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
      batchSize: 10,
    });

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].sourcePath).toBe("a.md");
    expect(result.suggestions[0].targetPath).toBe("b.md");
    expect(result.totals.inputTokens).toBe(200);
    expect(result.totals.cacheReadTokens).toBe(150);
  });

  it("passes cache_control: ephemeral on the system block", async () => {
    const notes = [makeNote("a.md", "x")];
    const candidates: CandidateSet[] = [{ sourcePath: "a.md", candidates: [] }];

    createMock.mockResolvedValueOnce(makeMockToolResponse("a.md", []));

    await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("enforces maxLinksPerNote across a multi-suggestion response", async () => {
    const notes = [makeNote("src.md", "source")];
    const candidates: CandidateSet[] = [{ sourcePath: "src.md", candidates: [] }];

    createMock.mockResolvedValueOnce(
      makeMockToolResponse("src.md", [
        { target: "t1.md", mode: "see_also", anchor: "T1" },
        { target: "t2.md", mode: "see_also", anchor: "T2" },
        { target: "t3.md", mode: "see_also", anchor: "T3" },
        { target: "t4.md", mode: "see_also", anchor: "T4" },
        { target: "t5.md", mode: "see_also", anchor: "T5" },
      ]),
    );

    const result = await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
      maxLinksPerNote: 2,
    });

    expect(result.suggestions.length).toBe(2);
    expect(result.suggestions.map((s) => s.targetPath)).toEqual(["t1.md", "t2.md"]);
  });

  it("fires onCheckpoint for each completed batch", async () => {
    const notes = [
      makeNote("a.md", "a"),
      makeNote("b.md", "b"),
      makeNote("c.md", "c"),
    ];
    const candidates: CandidateSet[] = notes.map((n) => ({
      sourcePath: n.entry.path,
      candidates: [],
    }));

    createMock.mockResolvedValue(makeMockToolResponse("a.md", []));

    const checkpoints: number[] = [];
    await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
      batchSize: 1,
      onCheckpoint: (i) => checkpoints.push(i),
    });

    expect(checkpoints).toEqual([0, 1, 2]);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("resumes from batch index when resumeFromBatch is set", async () => {
    const notes = [
      makeNote("a.md", "a"),
      makeNote("b.md", "b"),
      makeNote("c.md", "c"),
      makeNote("d.md", "d"),
    ];
    const candidates: CandidateSet[] = notes.map((n) => ({
      sourcePath: n.entry.path,
      candidates: [],
    }));

    createMock.mockResolvedValue(makeMockToolResponse("c.md", []));

    await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
      batchSize: 1,
      resumeFromBatch: 2,
    });

    // Only batches 2 and 3 should have been called (resumed from index 2)
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("skips batches with invalid tool_use payload (Zod reject)", async () => {
    const notes = [makeNote("a.md", "a")];
    const candidates: CandidateSet[] = [{ sourcePath: "a.md", candidates: [] }];

    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "submit_suggestions",
          input: {
            // Missing required fields — Zod should reject
            results: [
              {
                source_path: "a.md",
                suggestions: [{ target_path: "b.md" /* missing everything else */ }],
              },
            ],
          },
        },
      ],
      usage: { input_tokens: 50, output_tokens: 10 },
    });

    const result = await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
    });

    // Zod reject means no suggestions returned from this batch
    expect(result.suggestions.length).toBe(0);
  });

  it("aggregates token totals across multiple batches", async () => {
    const notes = [makeNote("a.md", "a"), makeNote("b.md", "b")];
    const candidates: CandidateSet[] = notes.map((n) => ({
      sourcePath: n.entry.path,
      candidates: [],
    }));

    createMock
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            name: "submit_suggestions",
            input: { results: [{ source_path: "a.md", suggestions: [] }] },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 80 },
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            name: "submit_suggestions",
            input: { results: [{ source_path: "b.md", suggestions: [] }] },
          },
        ],
        usage: { input_tokens: 30, output_tokens: 15, cache_read_input_tokens: 90 },
      });

    const result = await runSuggestionPipeline(notes, candidates, {
      apiKey: "sk-ant-fake",
      model: "claude-sonnet-4-5-20250514",
      batchSize: 1,
    });

    expect(result.totals.inputTokens).toBe(130);
    expect(result.totals.outputTokens).toBe(35);
    expect(result.totals.cacheReadTokens).toBe(170);
  });
});
