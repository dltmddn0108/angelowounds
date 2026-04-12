/**
 * Walk the vault, hash each markdown file, build a note index.
 * The result is fed into the parser (for full AST extraction) and the
 * embedder (for vector search).
 */

import { walkMarkdown } from "./fs-access";
import { createMatcher, parseIgnoreFile, type IgnoreMatcher } from "./ignore";
import type { NoteEntry } from "./types";

const IGNORE_FILE = ".obsidian-auto-linker-ignore";

async function sha256(bytes: string): Promise<string> {
  const buf = new TextEncoder().encode(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Read the raw contents of every markdown file in the vault, skipping
 * anything matched by the ignore matcher. Returns an array of `{entry, source}`
 * pairs. Title/aliases are filled in later by the parser.
 */
export async function scanVault(
  root: FileSystemDirectoryHandle,
  userPatterns: string[] = [],
): Promise<{ matcher: IgnoreMatcher; files: { entry: NoteEntry; source: string }[] }> {
  // Read the optional ignore file at the vault root.
  let filePatterns: string[] = [];
  try {
    const ignoreHandle = await root.getFileHandle(IGNORE_FILE);
    const file = await ignoreHandle.getFile();
    filePatterns = parseIgnoreFile(await file.text());
  } catch {
    // no ignore file is fine
  }

  const matcher = createMatcher([...filePatterns, ...userPatterns]);
  const found = await walkMarkdown(root);
  const files: { entry: NoteEntry; source: string }[] = [];

  for (const { path, file } of found) {
    if (matcher.shouldIgnore(path)) continue;
    const source = await file.text();
    const hash = await sha256(source);
    const title = pathToFallbackTitle(path);
    files.push({
      entry: {
        path,
        title,
        aliases: [],
        hash,
        size: source.length,
      },
      source,
    });
  }

  return { matcher, files };
}

function pathToFallbackTitle(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/i, "");
}
