/**
 * Client-side embeddings via @xenova/transformers.
 *
 * The model runs entirely in the browser (WASM or WebGPU) after a one-time
 * download. Embeddings are cached in IndexedDB keyed by content hash so
 * repeated scans of an unchanged vault do not re-run the model.
 */

import { get, set } from "idb-keyval";
import type { ParsedNote } from "../vault/types";

const DEFAULT_MODEL = "Xenova/multilingual-e5-small";
const CACHE_PREFIX = "oal:emb:";

export interface EmbedProgress {
  modelLoad?: { status: string; progress?: number };
  note?: { path: string; index: number; total: number };
}

export interface NoteEmbedding {
  path: string;
  /** Mean of all chunk vectors, normalized. Length = model dim (typically 384). */
  mean: Float32Array;
}

type PipelineFn = (
  texts: string | string[],
  opts?: { pooling?: "mean"; normalize?: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

let pipelinePromise: Promise<PipelineFn> | null = null;

async function getPipeline(
  model: string,
  onProgress?: (p: EmbedProgress) => void,
): Promise<PipelineFn> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const mod = await import("@xenova/transformers");
      // Hint: prefer WASM backend; we don't want to require WebGPU.
      const { pipeline } = mod;
      const fe = await pipeline("feature-extraction", model, {
        progress_callback: (raw: { status: string; progress?: number }) => {
          onProgress?.({ modelLoad: raw });
        },
      });
      return fe as unknown as PipelineFn;
    })();
  }
  return pipelinePromise;
}

export async function embedVault(
  notes: ParsedNote[],
  opts: {
    model?: string;
    onProgress?: (p: EmbedProgress) => void;
  } = {},
): Promise<NoteEmbedding[]> {
  const model = opts.model ?? DEFAULT_MODEL;
  const pipe = await getPipeline(model, opts.onProgress);
  const out: NoteEmbedding[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    opts.onProgress?.({
      note: { path: note.entry.path, index: i, total: notes.length },
    });

    const cacheKey = CACHE_PREFIX + model + ":" + note.entry.hash;
    const cached = await get<Float32Array>(cacheKey);
    if (cached) {
      out.push({ path: note.entry.path, mean: cached });
      continue;
    }

    // Use chunks if we have them, otherwise fall back to the summary.
    const texts =
      note.chunks.length > 0
        ? note.chunks.map((c) => c.text).filter((t) => t.length > 0)
        : [note.summary || note.entry.title];
    if (texts.length === 0) {
      const empty = new Float32Array(0);
      out.push({ path: note.entry.path, mean: empty });
      continue;
    }

    const result = await pipe(texts, { pooling: "mean", normalize: true });
    const dim = result.dims[result.dims.length - 1];
    const batch = result.data;
    const mean = new Float32Array(dim);
    const nRows = batch.length / dim;
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < dim; c++) {
        mean[c] += batch[r * dim + c];
      }
    }
    let norm = 0;
    for (let c = 0; c < dim; c++) {
      mean[c] /= nRows;
      norm += mean[c] * mean[c];
    }
    norm = Math.sqrt(norm) || 1;
    for (let c = 0; c < dim; c++) {
      mean[c] /= norm;
    }

    await set(cacheKey, mean);
    out.push({ path: note.entry.path, mean });
  }

  return out;
}
