/** Shared types for the vault pipeline. */

/** Metadata for a single note discovered during scan. */
export interface NoteEntry {
  /** Path relative to the vault root, using forward slashes. */
  path: string;
  /** Title: first H1 text or filename (no extension). */
  title: string;
  /** Aliases declared in frontmatter, if any. */
  aliases: string[];
  /** SHA-256 of the raw file bytes. */
  hash: string;
  /** File size in bytes. */
  size: number;
}

/** A protected range that must never be modified or have text inserted into it. */
export interface ProtectedRange {
  start: number;
  end: number;
  kind:
    | "frontmatter"
    | "code-fence"
    | "inline-code"
    | "math-block"
    | "inline-math"
    | "wikilink"
    | "embed"
    | "html"
    | "comment"
    | "templater"
    | "callout-header";
}

/** A semantic chunk of a note used for embedding. */
export interface NoteChunk {
  /** Heading path, e.g., ["Intro", "Motivation"]. Empty for body-level. */
  headingPath: string[];
  /** The raw text (markdown) of this chunk. */
  text: string;
}

/** The parsed representation of a single note. */
export interface ParsedNote {
  entry: NoteEntry;
  /** Original bytes of the note. */
  source: string;
  /** Short body excerpt used as glossary summary (first ~200 chars, cleaned). */
  summary: string;
  /** All headings found in the note, in document order. */
  headings: { depth: number; text: string; offset: number }[];
  /** Wikilink targets (minus the alias) already present in the note. */
  existingLinks: Set<string>;
  /** Semantic chunks for embedding. */
  chunks: NoteChunk[];
  /** Ranges that must never be modified. */
  protectedRanges: ProtectedRange[];
}

/** A suggestion to insert a wikilink from source to target. */
export interface LinkSuggestion {
  sourcePath: string;
  targetPath: string;
  insertionMode: "inline" | "see_also";
  /** For inline mode: the exact span in the source text to be replaced. */
  targetSpan?: string;
  /** The visible anchor text; for inline mode this is usually equal to targetSpan. */
  anchorText: string;
  confidence: number; // 0..1
  reasoning: string;
}
