/**
 * System prompt and tool-use schema for the batched Claude call.
 *
 * We use Claude's tool-use mechanism to get strictly-typed JSON out of
 * the model. The Zod schema in `suggest.ts` validates the tool input.
 */

import type { ParsedNote } from "../vault/types";
import type { CandidateSet } from "./candidates";

export const SYSTEM_PROMPT = `You help maintain an Obsidian vault by proposing wiki-style backlinks between semantically related notes.

Rules:
1. Only propose a link if the two notes share a concrete, non-trivial topic. Surface resemblance is not enough.
2. Prefer inline linking: identify an exact phrase in the source note that already names the target's concept, and replace that phrase with a wikilink. The phrase you return MUST appear verbatim in the source text the user gives you.
3. If no natural inline phrase exists, use the "see_also" insertion_mode so the writer can append the link to a "See also" section.
4. Never propose linking a note to itself.
5. Never propose a link that already exists in the source note.
6. Keep proposals conservative. It is better to return fewer, high-confidence suggestions than many weak ones.
7. The vault is multilingual (Korean, English, sometimes Japanese). Match the language of the source note when choosing anchor text.
8. Return proposals only via the submit_suggestions tool.`;

export const SUGGEST_TOOL_NAME = "submit_suggestions";

export const SUGGEST_TOOL_SCHEMA = {
  name: SUGGEST_TOOL_NAME,
  description:
    "Return zero or more wikilink suggestions for the source notes in this batch.",
  input_schema: {
    type: "object" as const,
    properties: {
      results: {
        type: "array",
        description: "One entry per source note in the batch.",
        items: {
          type: "object",
          properties: {
            source_path: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  target_path: { type: "string" },
                  insertion_mode: {
                    type: "string",
                    enum: ["inline", "see_also"],
                  },
                  target_span: {
                    type: "string",
                    description:
                      "For inline mode: the exact substring of the source note to replace. Empty for see_also.",
                  },
                  anchor_text: {
                    type: "string",
                    description:
                      "Visible anchor. For inline mode this is usually equal to target_span.",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                  },
                  reasoning: {
                    type: "string",
                    description: "Short justification shown to the user.",
                  },
                },
                required: [
                  "target_path",
                  "insertion_mode",
                  "anchor_text",
                  "confidence",
                  "reasoning",
                ],
              },
            },
          },
          required: ["source_path", "suggestions"],
        },
      },
    },
    required: ["results"],
  },
};

/** Build the stable glossary block — cached across all batches of a scan. */
export function buildGlossary(notes: ParsedNote[]): string {
  const lines = [
    "# Vault glossary",
    "Each entry is `path :: title :: aliases :: one-line summary`.",
    "",
  ];
  for (const n of notes) {
    const aliases = n.entry.aliases.length > 0 ? n.entry.aliases.join("|") : "";
    lines.push(`- ${n.entry.path} :: ${n.entry.title} :: ${aliases} :: ${n.summary}`);
  }
  return lines.join("\n");
}

/** Build the per-batch user message that contains the source notes and their candidates. */
export function buildBatchMessage(
  parsed: Map<string, ParsedNote>,
  batch: CandidateSet[],
  topK: number,
): string {
  const out: string[] = [];
  out.push("Analyze the following source notes and propose wikilinks.");
  out.push("");
  for (const set of batch) {
    const src = parsed.get(set.sourcePath);
    if (!src) continue;
    out.push(`## Source note: ${set.sourcePath}`);
    out.push(`Title: ${src.entry.title}`);
    if (src.entry.aliases.length > 0) {
      out.push(`Aliases: ${src.entry.aliases.join(", ")}`);
    }
    out.push("Body excerpt:");
    out.push("```");
    out.push(src.summary);
    out.push("```");
    out.push("");
    out.push("Candidates (ordered by embedding similarity):");
    for (const c of set.candidates.slice(0, topK)) {
      const t = parsed.get(c.targetPath);
      if (!t) continue;
      out.push(`- ${c.targetPath} — ${t.entry.title} — ${t.summary}`);
    }
    out.push("");
  }
  out.push(
    "Use the submit_suggestions tool to return one entry per source note. Prefer inline mode; fall back to see_also only when no natural phrase exists.",
  );
  return out.join("\n");
}
