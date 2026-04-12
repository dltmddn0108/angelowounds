# Obsidian Auto-Linker

A web app that scans an [Obsidian](https://obsidian.md) vault and proposes
semantically meaningful `[[wikilink]]` backlinks between related notes.
Every proposal is shown as a diff; only what you accept is written to disk.

## Privacy

- Notes never leave your browser. The app uses the **File System Access API**
  to read and write your vault directly.
- Embeddings run entirely client-side via
  [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers).
- The only network call is to the Anthropic API, directly from your browser,
  using **your own API key**. The key is stored encrypted in IndexedDB
  (AES-GCM via WebCrypto) with a non-extractable wrap key.

## How it works

1. **Scan** — the vault is walked once, each `.md` file is hashed and parsed.
2. **Protect** — frontmatter, code fences, math blocks, callout headers,
   templater, dataview, HTML and existing wikilinks are all marked as
   protected ranges. The writer cannot touch them.
3. **Embed** — each note is embedded with `multilingual-e5-small` (Korean,
   English, Japanese, etc.). Vectors are cached by content hash in IndexedDB.
4. **Candidates** — cosine top-K over mean note vectors, minus any pair the
   source already links to.
5. **Suggest** — source notes are batched (8 per call by default) and sent
   to Claude with the vault glossary in a `cache_control: ephemeral` block.
   Claude returns strictly-typed tool-use JSON (validated with Zod).
6. **Review** — each suggestion is shown as an inline span replacement or a
   "See also" bullet preview. Accept what you want.
7. **Apply** — for each accepted change the original bytes are written to
   `.auto-linker-backup/<timestamp>/` before the note is rewritten.
   In-session undo is a single click away.

## Browser support

Chromium-based browsers only (Chrome, Edge, Brave) — Firefox and Safari do
not implement the File System Access API.

## Local development

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # vitest unit tests
pnpm typecheck
```

## Project layout

```
app/          Next.js 15 pages (client-only, static export)
components/   React components
lib/vault/    Scanner, parser, writer, fs-access helpers
lib/ai/       Embed, candidates, prompts, cost, Claude suggest
lib/store/    Zustand stores
fixtures/     Fixture vaults for tests and demos
tests/unit/   Vitest (parser, writer, ignore, cost)
```
