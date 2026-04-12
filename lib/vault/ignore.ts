/**
 * Glob-style ignore matching for the vault.
 *
 * Supports a subset of .gitignore syntax sufficient for our needs:
 *   - `*` matches any sequence of characters except `/`
 *   - `**` matches any sequence including `/`
 *   - Lines starting with `#` are comments
 *   - Blank lines are ignored
 *   - Leading `!` is NOT supported (no negation in MVP)
 */

const DEFAULT_PATTERNS = [
  ".obsidian/**",
  ".trash/**",
  "Templates/**",
  ".auto-linker-backup/**",
];

export interface IgnoreMatcher {
  shouldIgnore(relativePath: string): boolean;
}

export function parseIgnoreFile(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

export function createMatcher(patterns: string[]): IgnoreMatcher {
  const all = [...DEFAULT_PATTERNS, ...patterns];
  const regexes = all.map(globToRegex);
  return {
    shouldIgnore(relativePath: string): boolean {
      return regexes.some((r) => r.test(relativePath));
    },
  };
}

function globToRegex(glob: string): RegExp {
  // Escape regex metachars, then translate glob-specific tokens.
  let out = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i += 2;
        if (glob[i] === "/") i += 1; // consume trailing slash after **
      } else {
        out += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      out += "[^/]";
      i += 1;
    } else if ("+.()|{}[]^$\\".includes(c)) {
      out += "\\" + c;
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return new RegExp("^" + out + "$");
}
