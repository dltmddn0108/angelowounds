/**
 * Cosine top-K candidate search.
 *
 * For 500–5000 notes this runs in well under a second in pure JS, which
 * is perfectly adequate for MVP. The interface is deliberately simple so
 * we can swap in hnswlib-wasm or voy-search later if the index becomes
 * a bottleneck.
 */

import type { NoteEmbedding } from "./embed";
import type { ParsedNote } from "../vault/types";

export interface Candidate {
  targetPath: string;
  score: number;
}

export interface CandidateSet {
  sourcePath: string;
  candidates: Candidate[];
}

export interface FindCandidatesOptions {
  topK?: number;
  /**
   * Pairs (source|target) that should never be proposed — e.g. because the
   * source already links to the target.
   */
  excludePairs?: Set<string>;
  /** If true, once A→B is proposed, B→A is excluded from later notes. */
  bidirectionalDedup?: boolean;
}

export function pairKey(sourcePath: string, targetPath: string): string {
  return sourcePath + "|" + targetPath;
}

export function findCandidates(
  embeddings: NoteEmbedding[],
  parsed: Map<string, ParsedNote>,
  opts: FindCandidatesOptions = {},
): CandidateSet[] {
  const topK = opts.topK ?? 20;
  const exclude = opts.excludePairs ?? new Set<string>();

  // Build an exclusion set that also skips pairs where source already links
  // directly to target (by title match against parsed.existingLinks).
  const alreadyLinked = new Set<string>();
  for (const [path, note] of parsed.entries()) {
    for (const tgt of note.existingLinks) {
      alreadyLinked.add(pairKey(path, tgt));
    }
  }

  const biDedup = opts.bidirectionalDedup ?? true;
  // Track proposed pairs so A→B prevents B→A in the same scan.
  const proposed = new Set<string>();

  const results: CandidateSet[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    const src = embeddings[i];
    if (src.mean.length === 0) {
      results.push({ sourcePath: src.path, candidates: [] });
      continue;
    }
    const scored: Candidate[] = [];
    for (let j = 0; j < embeddings.length; j++) {
      if (i === j) continue;
      const tgt = embeddings[j];
      if (tgt.mean.length === 0) continue;
      const key = pairKey(src.path, tgt.path);
      if (exclude.has(key)) continue;
      if (biDedup && proposed.has(pairKey(tgt.path, src.path))) continue;
      if (isAlreadyLinked(src.path, tgt.path, parsed, alreadyLinked)) continue;
      const score = cosine(src.mean, tgt.mean);
      scored.push({ targetPath: tgt.path, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, topK);
    // Record selected pairs for bidirectional dedup.
    if (biDedup) {
      for (const c of selected) proposed.add(pairKey(src.path, c.targetPath));
    }
    results.push({ sourcePath: src.path, candidates: selected });
  }

  return results;
}

function isAlreadyLinked(
  sourcePath: string,
  targetPath: string,
  parsed: Map<string, ParsedNote>,
  alreadyLinkedByPath: Set<string>,
): boolean {
  if (alreadyLinkedByPath.has(pairKey(sourcePath, targetPath))) return true;
  const src = parsed.get(sourcePath);
  const tgt = parsed.get(targetPath);
  if (!src || !tgt) return false;
  // Title match: existingLinks store normalized targets, title-only.
  const normalizedTitle = tgt.entry.title.toLowerCase();
  if (src.existingLinks.has(normalizedTitle)) return true;
  for (const alias of tgt.entry.aliases) {
    if (src.existingLinks.has(alias.toLowerCase())) return true;
  }
  return false;
}

function cosine(a: Float32Array, b: Float32Array): number {
  // Assumes both are L2-normalized. If not, caller should normalize.
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}
