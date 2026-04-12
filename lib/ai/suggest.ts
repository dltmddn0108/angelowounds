/**
 * Batched Claude suggestion pipeline.
 *
 * Given a set of parsed notes and their embedding-derived candidates,
 * group the source notes into batches of N, send each batch to Claude
 * with the vault glossary cached (prompt caching), and parse the
 * strictly-typed tool_use output into LinkSuggestions.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LinkSuggestion, ParsedNote } from "../vault/types";
import type { CandidateSet } from "./candidates";
import {
  SYSTEM_PROMPT,
  SUGGEST_TOOL_NAME,
  SUGGEST_TOOL_SCHEMA,
  buildGlossary,
  buildBatchMessage,
} from "./prompts";

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

export interface SuggestOptions {
  apiKey: string;
  model: string;
  batchSize?: number;
  topK?: number;
  /** Maximum number of new link suggestions per source note. */
  maxLinksPerNote?: number;
  onBatch?: (info: {
    index: number;
    total: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  }) => void;
  /** Resume from this batch index (0-based). */
  resumeFromBatch?: number;
  /** Called after each batch completes, for checkpoint persistence. */
  onCheckpoint?: (completedBatchIndex: number) => void;
}

export interface SuggestResult {
  suggestions: LinkSuggestion[];
  /** Total tokens Claude reported across all batches. */
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

export async function runSuggestionPipeline(
  parsedList: ParsedNote[],
  candidates: CandidateSet[],
  opts: SuggestOptions,
): Promise<SuggestResult> {
  const batchSize = opts.batchSize ?? 8;
  const topK = opts.topK ?? 20;
  const maxPerNote = opts.maxLinksPerNote ?? Infinity;
  const resumeFrom = opts.resumeFromBatch ?? 0;
  const parsedMap = new Map(parsedList.map((n) => [n.entry.path, n]));
  const glossary = buildGlossary(parsedList);

  const client = new Anthropic({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const out: LinkSuggestion[] = [];
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };

  const batches: CandidateSet[][] = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  // Track per-source-note suggestion counts for maxLinksPerNote.
  const countsPerNote = new Map<string, number>();

  for (let bi = resumeFrom; bi < batches.length; bi++) {
    const batch = batches[bi];
    const userMessage = buildBatchMessage(parsedMap, batch, topK);

    const response = await callWithRetry(() =>
      client.messages.create({
        model: opts.model,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT + "\n\n" + glossary,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [SUGGEST_TOOL_SCHEMA],
        tool_choice: { type: "tool", name: SUGGEST_TOOL_NAME },
        messages: [{ role: "user", content: userMessage }],
      }),
    );

    const usage = response.usage as unknown as {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    totals.inputTokens += usage.input_tokens ?? 0;
    totals.outputTokens += usage.output_tokens ?? 0;
    totals.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
    totals.cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;

    opts.onBatch?.({
      index: bi,
      total: batches.length,
      cacheReadTokens: usage.cache_read_input_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens,
    });

    for (const block of response.content) {
      if (block.type !== "tool_use" || block.name !== SUGGEST_TOOL_NAME) continue;
      const parsed = SuggestResultSchema.safeParse(block.input);
      if (!parsed.success) {
        console.warn("Invalid tool_use payload, skipping batch", parsed.error);
        continue;
      }
      for (const r of parsed.data.results) {
        for (const s of r.suggestions) {
          const count = countsPerNote.get(r.source_path) ?? 0;
          if (count >= maxPerNote) continue;
          out.push({
            sourcePath: r.source_path,
            targetPath: s.target_path,
            insertionMode: s.insertion_mode,
            targetSpan: s.target_span,
            anchorText: s.anchor_text,
            confidence: s.confidence,
            reasoning: s.reasoning,
          });
          countsPerNote.set(r.source_path, count + 1);
        }
      }
    }

    opts.onCheckpoint?.(bi);
  }

  return { suggestions: out, totals };
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status ?? 0;
      if (status !== 429 && status !== 503 && status < 500) throw err;
      const wait = Math.min(16000, 2000 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
