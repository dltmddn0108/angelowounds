/**
 * Pre-scan token and cost estimation.
 *
 * Numbers are rough but the goal is to give the user a realistic budget
 * preview before they burn through their API quota on a huge vault.
 */

import type { CandidateSet } from "./candidates";
import type { ParsedNote } from "../vault/types";

/** Approximate USD prices per million tokens. Update as Anthropic changes them. */
export const MODEL_PRICES: Record<
  string,
  { input: number; cachedRead: number; output: number }
> = {
  "claude-sonnet-4-5-20250514": { input: 3.0, cachedRead: 0.3, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, cachedRead: 0.1, output: 5.0 },
};

export interface CostEstimate {
  notes: number;
  batches: number;
  glossaryTokens: number;
  candidateTokens: number;
  estimatedInputTokens: number;
  estimatedCachedReadTokens: number;
  estimatedOutputTokens: number;
  estimatedUsd: number;
  estimatedSeconds: number;
}

export interface EstimateOptions {
  model: string;
  batchSize?: number;
  topK?: number;
}

/** Very rough token counter: ~1 token per 4 chars for English, ~1 per 2 for CJK.
 *  We use 2.5 as a safe middle for mixed Korean / English content. */
export function approxTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 2.5);
}

export function estimateCost(
  parsed: ParsedNote[],
  candidates: CandidateSet[],
  opts: EstimateOptions,
): CostEstimate {
  const batchSize = opts.batchSize ?? 8;
  const topK = opts.topK ?? 20;
  const price =
    MODEL_PRICES[opts.model] ?? MODEL_PRICES["claude-sonnet-4-5-20250514"];

  // Glossary is sent once (cached) and reused across every batch.
  const glossaryText = parsed
    .map((n) => `- ${n.entry.title}: ${n.summary}`)
    .join("\n");
  const glossaryTokens = approxTokens(glossaryText);

  // Per-note payload: source excerpt + candidate excerpts.
  const pathIndex = new Map(parsed.map((n) => [n.entry.path, n]));
  let perNotePayload = 0;
  for (const set of candidates) {
    const src = pathIndex.get(set.sourcePath);
    if (!src) continue;
    perNotePayload += approxTokens(src.summary);
    for (const c of set.candidates.slice(0, topK)) {
      const t = pathIndex.get(c.targetPath);
      if (!t) continue;
      perNotePayload += approxTokens(t.summary);
    }
  }

  const notes = parsed.length;
  const batches = Math.max(1, Math.ceil(notes / batchSize));

  // Output: roughly 150 tokens per note (small JSON tool use).
  const estimatedOutputTokens = notes * 150;

  // Input: glossary (cached after first batch) + per-note payload.
  // First batch pays full glossary cost; rest pay cached read.
  const estimatedInputTokens = glossaryTokens + perNotePayload;
  const estimatedCachedReadTokens = glossaryTokens * Math.max(0, batches - 1);

  const usd =
    (estimatedInputTokens / 1_000_000) * price.input +
    (estimatedCachedReadTokens / 1_000_000) * price.cachedRead +
    (estimatedOutputTokens / 1_000_000) * price.output;

  // ~3 seconds of Claude latency per batch including streaming.
  const estimatedSeconds = batches * 3;

  return {
    notes,
    batches,
    glossaryTokens,
    candidateTokens: perNotePayload,
    estimatedInputTokens,
    estimatedCachedReadTokens,
    estimatedOutputTokens,
    estimatedUsd: Number(usd.toFixed(4)),
    estimatedSeconds,
  };
}
