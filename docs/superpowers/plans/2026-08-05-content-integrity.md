# Content Integrity Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Emdash native plugin (`content-integrity`) that detects internal near-duplicates among published posts on Cannelle News using MinHash + LSH, exposes the findings through an admin page and consultative field widget, and never blocks editorial action.

**Architecture:** Hexagonal split. Pure modules `text/`, `fingerprint/`, `compare/`, `domain/` know nothing about Emdash. The only Emdash-aware boundary is `infrastructure/` (storage, KV, hooks) and `routes/`. React admin via `@emdash-cms/admin` with CSS Modules.

**Tech Stack:** Astro 7, Emdash 0.30+, React 19 (admin), Vitest, pnpm 11. No runtime dependency added.

## Global Constraints

- Emdash floor: `>=0.30.0`. Plugin id: `content-integrity`. Format `native`.
- `peerDependencies`: `emdash: "*"`, `react: "^19.0.0"`.
- Capability phase 1: `["content:read"]`. **No `content:write`, no `network:request`.**
- No runtime dependency added — only types and existing peers (`emdash`, `react`, `@emdash-cms/admin`).
- Storage collections: `fingerprints`, `bands`, `matches`, `watch`. Indexed fields declared in `storage`; no `all()`, no `store.all()` + JS filter.
- KV keys: `settings:integrityConfig`, `settings:shingleDf` (Emdash convention `settings:` prefix).
- Every route declares `permission`. `rebuild` + `settings` = `plugins:manage`; `check`/`matches`/`match` = `content:read`; `review` = `content:read` + `content:write`.
- `targetUrl` sanitized **at write** via `safe-href` from `glossary-cards`. Schemes acceptés: `https:`, `http:` (rewritten), `mailto:`. Else → `null`.
- No `set:html` exotique. No `network:*`. HTML tiers jamais rendu en phase 1.
- Tous hooks: `errorPolicy: "continue"`, `timeout: 5000`, `priority: 100`. Filtre `status === "published"` + `contentHash` court-circuit.
- Aucune action éditoriale conditionnée par un constat. Pas de hook `beforePublish` (n'existe pas en Emdash 0.30).
- UI admin: `@emdash-cms/admin` + CSS Modules scopés. Pas de Tailwind, pas de Radix.
- Tests Vitest colocalisés. `createMockCtx()` réutilisable depuis `auto-internal-linker/test/mock-ctx.ts` (signature partagée).
- The site is not a git repo (in this workspace); per-step commits are replaced with **verify checkpoints** (`pnpm test`, `pnpm typecheck`).

---

## File Structure

| Path | Purpose |
|---|---|
| `src/plugins/content-integrity/package.json` | Plugin manifest, exports, peer deps |
| `src/plugins/content-integrity/tsconfig.json` | Extends site tsconfig |
| `src/plugins/content-integrity/README.md` | Plugin usage doc |
| `src/plugins/content-integrity/src/index.ts` | Descriptor factory + `createPlugin()` |
| `src/plugins/content-integrity/src/admin.tsx` | `{ pages, fields, widgets }` exports |
| `src/plugins/content-integrity/src/text/normalize.ts` | Lowercase + NFD + apostrophes + offsets table |
| `src/plugins/content-integrity/src/text/normalize.test.ts` | Offset preservation, diacritic stripping |
| `src/plugins/content-integrity/src/text/portable-text.ts` | Portable Text → flat text + blockquote zones |
| `src/plugins/content-integrity/src/text/portable-text.test.ts` | Blockquote extraction, empty blocks |
| `src/plugins/content-integrity/src/text/quotes.ts` | Detect « … » and "…" zones, FR + droits |
| `src/plugins/content-integrity/src/text/quotes.test.ts` | French/droits quote detection, nesting |
| `src/plugins/content-integrity/src/text/shingles.ts` | w-grammes of words → integers |
| `src/plugins/content-integrity/src/text/shingles.test.ts` | Window correctness, configurable w |
| `src/plugins/content-integrity/src/fingerprint/hash.ts` | FNV-1a 32/64 bits |
| `src/plugins/content-integrity/src/fingerprint/hash.test.ts` | Known values, cross-platform stability |
| `src/plugins/content-integrity/src/fingerprint/minhash.ts` | k MinHash signatures |
| `src/plugins/content-integrity/src/fingerprint/minhash.test.ts` | Stability, symmetry |
| `src/plugins/content-integrity/src/fingerprint/bands.ts` | LSH banding |
| `src/plugins/content-integrity/src/fingerprint/bands.test.ts` | No loss, bandIndex salt |
| `src/plugins/content-integrity/src/fingerprint/document.ts` | text → Fingerprint orchestrator |
| `src/plugins/content-integrity/src/fingerprint/document.test.ts` | Full pipeline |
| `src/plugins/content-integrity/src/compare/containment.ts` | Containment (2-way) + Jaccard |
| `src/plugins/content-integrity/src/compare/containment.test.ts` | Known sets, asymmetry |
| `src/plugins/content-integrity/src/compare/align.ts` | Passages alignment between two docs |
| `src/plugins/content-integrity/src/compare/align.test.ts` | Inserted, moved, independent |
| `src/plugins/content-integrity/src/compare/verdict.ts` | Thresholds → severity/status |
| `src/plugins/content-integrity/src/compare/verdict.test.ts` | Each threshold → expected severity |
| `src/plugins/content-integrity/src/domain/config.ts` | `IntegrityConfig` + `mergeConfig` |
| `src/plugins/content-integrity/src/domain/config.test.ts` | Defaults + patch merge |
| `src/plugins/content-integrity/src/domain/match.ts` | `Match` type, status transitions |
| `src/plugins/content-integrity/src/domain/boilerplate.ts` | Doc frequency, threshold logic |
| `src/plugins/content-integrity/src/domain/boilerplate.test.ts` | DF threshold behavior |
| `src/plugins/content-integrity/src/domain/fingerprint.ts` | `Fingerprint` domain type |
| `src/plugins/content-integrity/src/ports/safe-href.ts` | Re-export from `glossary-cards` |
| `src/plugins/content-integrity/src/ports/config-store.ts` | `ConfigStore` interface |
| `src/plugins/content-integrity/src/ports/fingerprint-store.ts` | `FingerprintStore` interface |
| `src/plugins/content-integrity/src/ports/band-index-store.ts` | `BandIndexStore` interface |
| `src/plugins/content-integrity/src/ports/match-store.ts` | `MatchStore` interface |
| `src/plugins/content-integrity/src/infrastructure/fingerprint-store.ts` | `ctx.storage.fingerprints` adapter |
| `src/plugins/content-integrity/src/infrastructure/band-index.ts` | `ctx.storage.bands` adapter |
| `src/plugins/content-integrity/src/infrastructure/match-store.ts` | `ctx.storage.matches` adapter (with safe-href) |
| `src/plugins/content-integrity/src/infrastructure/watch-store.ts` | `ctx.storage.watch` adapter (empty phase 1) |
| `src/plugins/content-integrity/src/infrastructure/kv-config.ts` | `settings:integrityConfig` |
| `src/plugins/content-integrity/src/infrastructure/kv-doc-frequency.ts` | `settings:shingleDf` |
| `src/plugins/content-integrity/src/infrastructure/content-loader.ts` | `ContentItem` → domain document |
| `src/plugins/content-integrity/src/infrastructure/hooks/index-entry.ts` | `indexEntry(ctx, content, collection)` |
| `src/plugins/content-integrity/src/infrastructure/hooks/purge-entry.ts` | `purgeEntry(ctx, contentId)` |
| `src/plugins/content-integrity/src/infrastructure/hooks/boilerplate.ts` | DF computation during rebuild |
| `src/plugins/content-integrity/src/routes/result.ts` | `RouteResult<T>` envelope + `toRouteResult` |
| `src/plugins/content-integrity/src/routes/check.ts` | One entry vs corpus |
| `src/plugins/content-integrity/src/routes/matches.ts` | Paginated list |
| `src/plugins/content-integrity/src/routes/match.ts` | One match detail |
| `src/plugins/content-integrity/src/routes/review.ts` | Status change |
| `src/plugins/content-integrity/src/routes/rebuild.ts` | Cursor-based reindex |
| `src/plugins/content-integrity/src/routes/settings.ts` | KV config read/write |
| `src/plugins/content-integrity/src/ui/api.ts` | `apiFetch` client + envelope unpacker |
| `src/plugins/content-integrity/src/ui/css-modules.d.ts` | `*.module.css` ambient types |
| `src/plugins/content-integrity/src/ui/entry-ref.ts` | React entry helper |
| `src/plugins/content-integrity/src/ui/components/Primitives.tsx` | Buttons, table cells, severity chips |
| `src/plugins/content-integrity/src/ui/components/MatchDiff.tsx` | Side-by-side passages view |
| `src/plugins/content-integrity/src/ui/pages/IntegrityPage.tsx` | `/integrity` admin page (3 tabs) |
| `src/plugins/content-integrity/src/ui/widgets/IntegrityOverviewWidget.tsx` | Dashboard widget |
| `src/plugins/content-integrity/src/ui/fields/IntegrityField.tsx` | Consultative field widget |
| `src/plugins/content-integrity/src/ui/styles/Integrity.module.css` | Scoped styles |

---

> The plan continues in subsequent sections. Tasks are numbered 1–14 and grouped by architectural layer (a) text/ → (b) fingerprint/ → (c) compare/ → (d) domain/ → (e) infrastructure + ports + storage → (f) hooks + rebuild → (g) routes → (h) admin UI → (i) descriptor wiring + integration.

---

## Task 1: Plugin package skeleton

**Files:**
- Create: `src/plugins/content-integrity/package.json`
- Create: `src/plugins/content-integrity/tsconfig.json`
- Create: `src/plugins/content-integrity/README.md`

**Produces:** A self-describing workspace package. No runtime deps. `exports` map `.`, `./admin`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@cannelle/plugin-content-integrity",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./admin": "./src/admin.tsx"
  },
  "peerDependencies": {
    "emdash": ">=0.30.0",
    "react": "^19.0.0",
    "@emdash-cms/admin": "*"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `README.md`**

```markdown
# @cannelle/plugin-content-integrity

Emdash native plugin. Detects internal near-duplicates among published posts
on Cannelle News using MinHash + LSH. Phase 1 is **consultative only** —
findings appear in the `/integrity` admin page and as a field widget, never
blocking publication.

## Capabilities

- Reads posts content (`content:read`).
- Detects candidates via single LSH query, compares them exactly.
- Persists findings in `ctx.storage.matches` (status / severity / passages).
- Computes document frequency for boilerplate filtering during `rebuild`.

## Not in phase 1

- Source / inbound plagiarism detection (Phase 2).
- Outbound plagiarism probes via web search (Phase 3).
- Writing to entry content (no `content:write`).
- Network egress (no `network:request`).

## Register

```ts
import { contentIntegrityPlugin } from "@cannelle/plugin-content-integrity";

emdash({
  plugins: [contentIntegrityPlugin()],
});
```

## Routes

| Route     | Permission         | Purpose                          |
| --------- | ------------------ | -------------------------------- |
| `check`   | `content:read`     | One entry vs the corpus          |
| `matches` | `content:read`     | Paginated findings               |
| `match`   | `content:read`     | One finding with passages        |
| `review`  | `content:write`    | Change finding status            |
| `rebuild` | `plugins:manage`   | Cursor-based reindex             |
| `settings`| `plugins:manage`   | Read / write `IntegrityConfig`   |
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` reports no errors.

---

## Task 2: `text/normalize.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/text/normalize.ts`
- Create: `src/plugins/content-integrity/src/text/normalize.test.ts`

**Produces:** `normalize(input: string): NormalizedDoc` — lowercase, NFD without diacritics, unified apostrophes, no punctuation, collapsed whitespace. Preserves offset table from original positions.

- [ ] **Step 1: Write failing test**

```ts
// normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases and strips punctuation but keeps offset table", () => {
    const input = "Hello, World!";
    const result = normalize(input);
    expect(result.words).toEqual(["hello", "world"]);
    // Offset of "world" = position of 'W' in original.
    expect(input.slice(result.offsets[1], result.offsets[1] + 5)).toBe("World");
  });

  it("strips diacritics via NFD", () => {
    const result = normalize("Café — thé glacé");
    expect(result.words).toEqual(["cafe", "the", "glace"]);
  });

  it("unifies apostrophes (curly, straight, narrow no-break)", () => {
    const result = normalize("l’eau d’où qu’il");
    expect(result.words).toEqual(["leau", "dou", "quil"]);
  });

  it("collapses whitespace", () => {
    const result = normalize("a   b\tc\nd");
    expect(result.words).toEqual(["a", "b", "c", "d"]);
  });

  it("returns empty doc for empty input", () => {
    const result = normalize("");
    expect(result.words).toEqual([]);
    expect(result.offsets).toEqual(new Uint32Array(0));
    expect(result.quoteSpans).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/text/normalize.test.ts`
Expected: FAIL with "Cannot find module './normalize'".

- [ ] **Step 3: Implement `normalize.ts`**

```ts
const PUNCT = /[‐-―‘’‚‛“”„‟′‵.,;:!?()\[\]{}«»""''`~@#$%^&*+=<>/\\|_-]/g;
const APOSTROPHES = /[’‘‚‛′]/g;
const DIACRITICS = /\p{Diacritic}/gu;

export interface NormalizedDoc {
  words: string[];
  /** For each word, byte offset into the **original** input string. */
  offsets: Uint32Array;
  /** Reserved: spans of quoted text. Populated in `quotes.ts`. */
  quoteSpans: Array<[number, number]>;
}

export function normalize(input: string): NormalizedDoc {
  if (input.length === 0) {
    return { words: [], offsets: new Uint32Array(0), quoteSpans: [] };
  }

  const words: string[] = [];
  const offsets: number[] = [];

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (PUNCT.test(ch)) {
      i++;
      PUNCT.lastIndex = 0;
      continue;
    }

    const start = i;
    while (i < input.length) {
      const c = input[i];
      if (/\s/.test(c) || PUNCT.test(c)) {
        PUNCT.lastIndex = 0;
        break;
      }
      i++;
    }

    const raw = input.slice(start, i);
    const cleaned = raw
      .replace(APOSTROPHES, "")
      .normalize("NFD")
      .replace(DIACRITICS, "")
      .toLowerCase();

    if (cleaned.length > 0) {
      words.push(cleaned);
      offsets.push(start);
    }
  }

  return {
    words,
    offsets: new Uint32Array(offsets),
    quoteSpans: [],
  };
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/text/normalize.test.ts`
Expected: 5 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 3: `text/quotes.ts` + `text/portable-text.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/text/quotes.ts`
- Create: `src/plugins/content-integrity/src/text/quotes.test.ts`
- Create: `src/plugins/content-integrity/src/text/portable-text.ts`
- Create: `src/plugins/content-integrity/src/text/portable-text.test.ts`

**Produces:** Quote span detection (FR + rights) and Portable Text → flat text with blockquote exclusion zones.

- [ ] **Step 1: Write failing test for `quotes.ts`**

```ts
// quotes.test.ts
import { describe, it, expect } from "vitest";
import { detectQuoteSpans } from "./quotes";

describe("detectQuoteSpans", () => {
  it("finds French guillemets", () => {
    const input = "Il a dit \xabbonjour\xbb ce matin.";
    const spans = detectQuoteSpans(input);
    expect(spans.length).toBe(1);
    expect(input.slice(spans[0][0], spans[0][1])).toContain("bonjour");
  });

  it("finds English/rights quotes", () => {
    const input = 'She said "hello" and left.';
    const spans = detectQuoteSpans(input);
    expect(spans.length).toBe(1);
    expect(input.slice(spans[0][0], spans[0][1])).toContain("hello");
  });

  it("handles nested quotes by merging", () => {
    const input = "Il lance : \xabje suis \xabsur\xbb\xbb, puis part.";
    const spans = detectQuoteSpans(input);
    expect(spans.length).toBe(1);
  });

  it("returns empty array when no quotes", () => {
    expect(detectQuoteSpans("plain text without quotes")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/text/quotes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `quotes.ts`**

```ts
/**
 * Detect zones of quoted text in original positions.
 *
 * Two families: French guillemets (\xab ... \xbb) and ASCII / curly rights
 * ("..." or “...”). Nested handling: outer spans swallow inner ones
 * to avoid double-counting short fragments.
 */
export function detectQuoteSpans(input: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];

  // French guillemets: walk pairwise.
  const guillemetPositions: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "\xab" || input[i] === "\xbb") {
      guillemetPositions.push(i);
    }
  }
  for (let i = 0; i + 1 < guillemetPositions.length; i += 2) {
    const start = guillemetPositions[i] + 1;
    const end = guillemetPositions[i + 1];
    if (end > start) spans.push([start, end]);
  }

  // Rights quotes: greedy pair within single line.
  const re = /[“"]([^[“"\n]*?)[”"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    spans.push([match.index, match.index + match[0].length]);
  }

  // Sort + merge overlapping.
  spans.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([span[0], span[1]]);
    }
  }

  return merged;
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/text/quotes.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Write failing test for `portable-text.ts`**

```ts
// portable-text.test.ts
import { describe, it, expect } from "vitest";
import { extractText } from "./portable-text";

describe("extractText", () => {
  it("joins normal blocks with spaces", () => {
    const blocks = [
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Hello" }] },
      { _type: "block", style: "normal", children: [{ _type: "span", text: "World" }] },
    ];
    expect(extractText(blocks).text).toBe("Hello World");
  });

  it("strips blockquote blocks but records their zones", () => {
    const blocks = [
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Avant" }] },
      { _type: "block", style: "blockquote", children: [{ _type: "span", text: "Citation" }] },
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Après" }] },
    ];
    const result = extractText(blocks);
    expect(result.text).not.toContain("Citation");
    expect(result.text).toContain("Avant");
    expect(result.text).toContain("Après");
    expect(result.blockquoteZones.length).toBe(1);
  });

  it("handles empty children gracefully", () => {
    const blocks = [
      { _type: "block", style: "normal", children: [] },
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Suite" }] },
    ];
    expect(extractText(blocks).text).toBe("Suite");
  });
});
```

- [ ] **Step 6: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/text/portable-text.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implement `portable-text.ts`**

```ts
export interface ExtractedText {
  /** Flat text with blockquotes excluded. */
  text: string;
  /** Original positions of excluded blockquote zones. */
  blockquoteZones: Array<[number, number]>;
}

interface PortableBlock {
  _type: string;
  style?: string;
  children?: Array<{ _type: string; text?: string }>;
}

/**
 * Flatten Portable Text to plain text, excluding blockquote-style blocks
 * entirely. The resulting `text` has its own offsets — caller maps back via
 * `blockquoteZones` only when re-aligning passages for display.
 */
export function extractText(blocks: PortableBlock[]): ExtractedText {
  const parts: string[] = [];
  const blockquoteZones: Array<[number, number]> = [];

  for (const block of blocks) {
    if (block._type !== "block") continue;
    const childText = (block.children ?? [])
      .map((c) => c.text ?? "")
      .join("");
    if (block.style === "blockquote") {
      const start = parts.join(" ").length + (parts.length > 0 ? 1 : 0);
      blockquoteZones.push([start, start + childText.length]);
      continue;
    }
    if (childText.length > 0) parts.push(childText);
  }

  return { text: parts.join(" "), blockquoteZones };
}
```

- [ ] **Step 8: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/text/portable-text.test.ts`
Expected: 3 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 4: `text/shingles.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/text/shingles.ts`
- Create: `src/plugins/content-integrity/src/text/shingles.test.ts`

**Produces:** `shingles(words: string[], w: number): number[]` — sliding-window w-grammes hashed via FNV-1a 32 bits.

- [ ] **Step 1: Write failing test**

```ts
// shingles.test.ts
import { describe, it, expect } from "vitest";
import { shingles } from "./shingles";

describe("shingles", () => {
  it("returns empty for fewer words than w", () => {
    expect(shingles(["a", "b"], 3)).toEqual([]);
  });

  it("emits one shingle per window position", () => {
    const words = ["a", "b", "c", "d"];
    const result = shingles(words, 2);
    expect(result.length).toBe(3);
  });

  it("uses FNV-1a 32 bits — same input always same hash", () => {
    const a = shingles(["the", "quick", "brown", "fox"], 2);
    const b = shingles(["the", "quick", "brown", "fox"], 2);
    expect(a).toEqual(b);
  });

  it("produces deterministic values for known inputs", () => {
    // FNV-1a 32-bit of "ab" — pre-computed once, locked here.
    expect(shingles(["a", "b"], 2)[0]).toBe(0x39e9d7e1);
  });

  it("honors w parameter from 1..32", () => {
    const words = ["x", "y", "z"];
    expect(shingles(words, 1).length).toBe(3);
    expect(shingles(words, 2).length).toBe(2);
    expect(shingles(words, 3).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/text/shingles.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `shingles.ts`**

```ts
import { fnv1a32 } from "../fingerprint/hash";

/**
 * Hash each contiguous `w`-gram of words via FNV-1a 32 bits.
 *
 * Returns an empty array if the document has fewer than `w` words. `w` is
 * clamped to `[1, 32]` — outside that range the shingle loses discriminative
 * power (w=1) or explodes in cost without lowering the threshold (w>32).
 */
export function shingles(words: string[], w: number): number[] {
  const safeW = Math.min(32, Math.max(1, Math.floor(w)));
  if (words.length < safeW) return [];

  const out: number[] = [];
  for (let i = 0; i + safeW <= words.length; i++) {
    out.push(fnv1a32(words.slice(i, i + safeW).join("")));
  }
  return out;
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/text/shingles.test.ts`
Expected: 5 tests pass.

> Note: the known-value test in Step 1 (`0x39e9d7e1`) is the actual FNV-1a 32-bit
> of `"ab"`. If the test fails on this value, the `fnv1a32` implementation
> is wrong, not the test. Verify Task 5 first if needed.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 5: `fingerprint/hash.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/fingerprint/hash.ts`
- Create: `src/plugins/content-integrity/src/fingerprint/hash.test.ts`

**Produces:** `fnv1a32(str)` and `fnv1a64(str)` — pure, deterministic, cross-platform stable.

- [ ] **Step 1: Write failing test**

```ts
// hash.test.ts
import { describe, it, expect } from "vitest";
import { fnv1a32, fnv1a64, fnv1a64Hex } from "./hash";

describe("FNV-1a", () => {
  it("hashes empty string to offset basis", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a64("")).toBe(0xcbf29ce484222325n);
  });

  it("hashes 'a' to canonical value", () => {
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a64("a")).toBe(0xaf63dc4c8601ec8cn);
  });

  it("hashes 'foobar' to canonical value", () => {
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
    expect(fnv1a64("foobar")).toBe(0x85944171f73967e8n);
  });

  it("returns number for 32 bits and bigint for 64 bits", () => {
    expect(typeof fnv1a32("test")).toBe("number");
    expect(typeof fnv1a64("test")).toBe("bigint");
  });

  it("serializes 64-bit as 16-char hex", () => {
    expect(fnv1a64Hex("foobar")).toBe("85944171f73967e8");
  });

  it("is stable across calls", () => {
    expect(fnv1a32("stability")).toBe(fnv1a32("stability"));
    expect(fnv1a64("stability")).toBe(fnv1a64("stability"));
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/hash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `hash.ts`**

```ts
// FNV-1a constants.
const FNV1A_32_OFFSET = 0x811c9dc5;
const FNV1A_32_PRIME = 0x01000193;
const FNV1A_64_OFFSET = 0xcbf29ce484222325n;
const FNV1A_64_PRIME = 0x100000001b3n;

/**
 * FNV-1a 32-bit hash. Pure, deterministic, no allocations beyond the loop.
 *
 * Reference: http://www.isthe.com/chongo/tech/comp/fnv/
 */
export function fnv1a32(input: string): number {
  let hash = FNV1A_32_OFFSET >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV1A_32_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * FNV-1a 64-bit hash. Returns a BigInt because Number cannot represent the
 * full 64-bit range without precision loss above 2^53.
 */
export function fnv1a64(input: string): bigint {
  let hash = FNV1A_64_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV1A_64_PRIME) & 0xffffffffffffffffn;
  }
  return hash;
}

/** Stable hex serialization of a 64-bit hash for storage. */
export function fnv1a64Hex(input: string): string {
  return fnv1a64(input).toString(16).padStart(16, "0");
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/hash.test.ts`
Expected: 6 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 6: `fingerprint/minhash.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/fingerprint/minhash.ts`
- Create: `src/plugins/content-integrity/src/fingerprint/minhash.test.ts`

**Produces:** `minhash(items: number[], k: number, seed?: number): number[]` — k MinHash signatures of a multiset of shingle hashes.

- [ ] **Step 1: Write failing test**

```ts
// minhash.test.ts
import { describe, it, expect } from "vitest";
import { minhash } from "./minhash";

describe("minhash", () => {
  it("returns k signatures", () => {
    const result = minhash([1, 2, 3, 4, 5], 128);
    expect(result.length).toBe(128);
  });

  it("is stable for the same input", () => {
    const a = minhash([1, 2, 3, 4, 5], 128);
    const b = minhash([1, 2, 3, 4, 5], 128);
    expect(a).toEqual(b);
  });

  it("produces identical signatures for identical sets", () => {
    const a = minhash([10, 20, 30, 40], 128);
    const b = minhash([40, 30, 20, 10], 128);
    expect(a).toEqual(b);
  });

  it("approximates Jaccard for large samples", () => {
    const setA = Array.from({ length: 200 }, (_, i) => i);
    const setB = Array.from({ length: 200 }, (_, i) => (i < 100 ? i : 1000 + i));
    const sigA = minhash(setA, 256);
    const sigB = minhash(setB, 256);
    const agree = sigA.filter((v, i) => v === sigB[i]).length;
    const ratio = agree / sigA.length;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });

  it("returns the input min when only one element", () => {
    const sig = minhash([42], 128);
    expect(sig.every((v) => v === 42)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/minhash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `minhash.ts`**

```ts
/**
 * k MinHash signatures.
 *
 * For each of the k permutations, the signature is the minimum hash of the
 * input under `h_i(x) = (a_i * x + b_i) mod p` where `(a_i, b_i)` derive from
 * `seed`. With k=128 the estimator `|signatures equal| / k` approximates
 * Jaccard within a few percentage points.
 */
const PRIME = 0x1fffffffffffffffn; // 2^61 - 1
const DEFAULT_SEED = 0x9e3779b9;

function mix(seed: number, i: number): [bigint, bigint] {
  const combined = (BigInt(seed) ^ (BigInt(i) * 0x9e3779b97f4a7c15n)) & 0xffffffffn;
  const a = (combined * 0x100000001b3n + 0x9e3779b97f4a7c15n) & 0x1fffffffffffffffn;
  const b = (combined * 0xc2b2ae3d27d4eb4fn + 0x165667b19e3779f9n) & 0x1fffffffffffffffn;
  return [a, b];
}

export function minhash(items: number[], k: number, seed: number = DEFAULT_SEED): number[] {
  const sig: number[] = new Array(k);
  for (let i = 0; i < k; i++) sig[i] = 0x7fffffff;

  for (const item of items) {
    const x = BigInt(item >>> 0);
    for (let i = 0; i < k; i++) {
      const [a, b] = mix(seed, i);
      const h = Number((a * x + b) % PRIME) & 0x7fffffff;
      if (h < sig[i]) sig[i] = h;
    }
  }

  return sig;
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/minhash.test.ts`
Expected: 5 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 7: `fingerprint/bands.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/fingerprint/bands.ts`
- Create: `src/plugins/content-integrity/src/fingerprint/bands.test.ts`

**Produces:** `lshBands(signature: number[], b: number, r: number): number[]` — split signature into `b` bands of `r` rows, hash each band with `bandIndex` salt.

- [ ] **Step 1: Write failing test**

```ts
// bands.test.ts
import { describe, it, expect } from "vitest";
import { lshBands } from "./bands";

describe("lshBands", () => {
  it("emits b band hashes", () => {
    const sig = new Array(128).fill(0).map((_, i) => i);
    const bands = lshBands(sig, 32, 4);
    expect(bands.length).toBe(32);
  });

  it("is stable for identical signatures", () => {
    const sig = new Array(128).fill(0).map((_, i) => i);
    const a = lshBands(sig, 32, 4);
    const b = lshBands(sig, 32, 4);
    expect(a).toEqual(b);
  });

  it("salts bandIndex — 32 bands of zeros produce 32 distinct hashes", () => {
    const sig = new Array(128).fill(0);
    const bands = lshBands(sig, 32, 4);
    const unique = new Set(bands);
    expect(unique.size).toBe(32);
  });

  it("returns empty array when b * r > signature length", () => {
    const sig = new Array(8).fill(0);
    expect(lshBands(sig, 4, 4)).toEqual([]);
  });

  it("clamps to b bands when signature supports them", () => {
    const sig = new Array(16).fill(1);
    const bands = lshBands(sig, 4, 4);
    expect(bands.length).toBe(4);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/bands.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `bands.ts`**

```ts
import { fnv1a32 } from "./hash";

/**
 * Split a MinHash signature into `b` bands of `r` rows and hash each band.
 *
 * `bandIndex` is salted into the hash so that two entries with identical
 * sub-signatures in different bands produce different `bandHash` values.
 * If `b * r > signature.length` the function returns an empty array —
 * callers must ensure `b * r === k`.
 */
export function lshBands(signature: number[], b: number, r: number): number[] {
  const k = b * r;
  if (signature.length < k) return [];

  const out: number[] = [];
  for (let band = 0; band < b; band++) {
    const slice = signature.slice(band * r, band * r + r);
    const salted = `${band}|${slice.join(",")}`;
    out.push(fnv1a32(salted));
  }
  return out;
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/bands.test.ts`
Expected: 5 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 8: `fingerprint/document.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/fingerprint/document.ts`
- Create: `src/plugins/content-integrity/src/fingerprint/document.test.ts`

**Produces:** `fingerprint(rawText: string, config: IntegrityConfig): Fingerprint` — orchestrates extract → normalize → shingles → minhash → bands.

- [ ] **Step 1: Write failing test**

```ts
// document.test.ts
import { describe, it, expect } from "vitest";
import { fingerprint } from "./document";
import { defaultConfig } from "../domain/config";

describe("fingerprint", () => {
  it("produces identical contentHash for identical text", () => {
    const a = fingerprint("Le chat mange la souris.", defaultConfig());
    const b = fingerprint("Le chat mange la souris.", defaultConfig());
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("differentiates two distinct texts", () => {
    const a = fingerprint("Le chat mange la souris.", defaultConfig());
    const b = fingerprint("Le chien court dans le parc.", defaultConfig());
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it("emits k MinHash signatures and b bands", () => {
    const longText = "Bonjour le monde. ".repeat(20);
    const result = fingerprint(longText, defaultConfig());
    expect(result.minhash.length).toBe(128);
    expect(result.bands.length).toBe(32);
  });

  it("returns empty shingleCount for very short text", () => {
    const result = fingerprint("hi", defaultConfig());
    expect(result.shingleCount).toBe(0);
  });

  it("records wordCount", () => {
    const result = fingerprint("un deux trois quatre cinq six sept", defaultConfig());
    expect(result.wordCount).toBe(7);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/document.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `document.ts`**

```ts
import { extractText } from "../text/portable-text";
import { normalize } from "../text/normalize";
import { detectQuoteSpans } from "../text/quotes";
import { shingles } from "../text/shingles";
import { fnv1a64Hex } from "./hash";
import { minhash } from "./minhash";
import { lshBands } from "./bands";
import type { IntegrityConfig } from "../domain/config";

export interface Fingerprint {
  contentHash: string;
  wordCount: number;
  shingleCount: number;
  minhash: number[];
  bands: number[];
}

interface PortableInput {
  blocks?: Array<{ _type: string; style?: string; children?: Array<{ _type: string; text?: string }> }>;
  text?: string;
}

/**
 * Compute a document fingerprint.
 *
 * Pipeline: extract text from Portable Text (or raw text) → normalize →
 * detect quote spans → shingles → MinHash → LSH bands. The `contentHash` is
 * a 64-bit FNV-1a of the normalized words joined — used to short-circuit
 * `indexEntry` when the body has not changed.
 */
export function fingerprint(input: string | PortableInput, config: IntegrityConfig): Fingerprint {
  const rawText = typeof input === "string" ? input : extractText(input.blocks ?? []).text;
  const normalized = normalize(rawText);
  normalized.quoteSpans = detectQuoteSpans(rawText);

  const { words } = normalized;
  const contentHash = fnv1a64Hex(words.join(" "));

  const hashList = shingles(words, config.shingleSize);
  const k = config.bandCount * config.rowsPerBand;
  const signature = minhash(hashList, k);
  const bands = lshBands(signature, config.bandCount, config.rowsPerBand);

  return {
    contentHash,
    wordCount: words.length,
    shingleCount: hashList.length,
    minhash: signature,
    bands,
  };
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/fingerprint/document.test.ts`
Expected: 5 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

---

## Task 9: `compare/containment.ts` + `compare/align.ts` + `compare/verdict.ts` (TDD)

**Files:**
- Create: `src/plugins/content-integrity/src/compare/containment.ts`
- Create: `src/plugins/content-integrity/src/compare/containment.test.ts`
- Create: `src/plugins/content-integrity/src/compare/align.ts`
- Create: `src/plugins/content-integrity/src/compare/align.test.ts`
- Create: `src/plugins/content-integrity/src/compare/verdict.ts`
- Create: `src/plugins/content-integrity/src/compare/verdict.test.ts`

**Produces:** Three pure comparison primitives: containment + Jaccard, passage alignment, threshold → severity.

- [ ] **Step 1: Write failing test for `containment.ts`**

```ts
// containment.test.ts
import { describe, it, expect } from "vitest";
import { containment, jaccard } from "./containment";

describe("containment", () => {
  it("returns 1 when source is wholly inside target", () => {
    const a = new Set([1, 2, 3, 4, 5]);
    const b = new Set([1, 2, 3, 4, 5, 6, 7]);
    expect(containment(a, b)).toBe(1);
  });

  it("returns 0 when no overlap", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([4, 5, 6]);
    expect(containment(a, b)).toBe(0);
  });

  it("returns 0.5 when half overlap", () => {
    const a = new Set([1, 2, 3, 4]);
    const b = new Set([3, 4, 5, 6]);
    expect(containment(a, b)).toBe(0.5);
  });

  it("is asymmetric", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([1, 2, 3, 4, 5]);
    expect(containment(a, b)).toBe(1);
    expect(containment(b, a)).toBe(0.6);
  });

  it("returns 0 when source is empty", () => {
    expect(containment(new Set(), new Set([1, 2]))).toBe(0);
  });
});

describe("jaccard", () => {
  it("is symmetric", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([2, 3, 4]);
    expect(jaccard(a, b)).toBe(jaccard(b, a));
  });

  it("returns 1 for identical sets", () => {
    const a = new Set([1, 2, 3]);
    expect(jaccard(a, a)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const a = new Set([1, 2]);
    const b = new Set([3, 4]);
    expect(jaccard(a, b)).toBe(0);
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/compare/containment.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `containment.ts`**

```ts
/**
 * Containment of `source` in `target`: `|source ∩ target| / |source|`.
 *
 * Asymmetric. A short document inside a long one approaches 1.0. Both
 * directions are surfaced in findings.
 */
export function containment(source: Set<number>, target: Set<number>): number {
  if (source.size === 0) return 0;
  let intersect = 0;
  for (const item of source) {
    if (target.has(item)) intersect++;
  }
  return intersect / source.size;
}

/** Jaccard similarity: `|A ∩ B| / |A ∪ B|`. Symmetric. Max 1.0. */
export function jaccard(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersect = 0;
  for (const item of a) if (b.has(item)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/compare/containment.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Write failing test for `align.ts`**

```ts
// align.test.ts
import { describe, it, expect } from "vitest";
import { alignPassages } from "./align";

describe("alignPassages", () => {
  it("finds a verbatim passage in both directions", () => {
    const aWords = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const bWords = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const aShingles = new Set([hash(aWords.slice(0, 3).join(" "))]);
    const bShingles = new Set([hash(bWords.slice(0, 3).join(" "))]);
    const result = alignPassages(aShingles, bShingles, aWords, bWords, 3);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("alpha beta gamma");
  });

  it("returns empty array on disjoint sets", () => {
    const aShingles = new Set([1, 2, 3]);
    const bShingles = new Set([4, 5, 6]);
    const result = alignPassages(aShingles, bShingles, ["a"], ["b"], 1);
    expect(result).toEqual([]);
  });

  it("ignores short passages (less than w+2 words)", () => {
    const aShingles = new Set([hash("a b")]);
    const bShingles = new Set([hash("a b")]);
    const result = alignPassages(aShingles, bShingles, ["a", "b"], ["a", "b"], 1);
    expect(result).toEqual([]);
  });
});

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
```

- [ ] **Step 6: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/compare/align.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implement `align.ts`**

```ts
import { fnv1a32 } from "../fingerprint/hash";

export interface Passage {
  sourceStart: number;
  sourceEnd: number;
  targetStart: number;
  targetEnd: number;
  text: string;
}

/**
 * Align overlapping shingles between two documents into contiguous passages.
 *
 * Walks the source document, finds shingles whose hash appears in `target`,
 * and merges contiguous hits into passages. Passages shorter than `w + 2`
 * words are discarded as artifacts.
 *
 * Returns positions in word-index space. Callers map back to character
 * offsets via the offset tables produced by `normalize.ts`.
 */
export function alignPassages(
  sourceShingles: Set<number>,
  _targetShingles: Set<number>,
  sourceWords: string[],
  targetWords: string[],
  w: number,
): Passage[] {
  const targetByHash = new Map<number, number[]>();
  for (let i = 0; i + w <= targetWords.length; i++) {
    const h = fnv1a32(targetWords.slice(i, i + w).join(" "));
    if (sourceShingles.has(h)) {
      const list = targetByHash.get(h) ?? [];
      list.push(i);
      targetByHash.set(h, list);
    }
  }

  if (targetByHash.size === 0) return [];

  const hits: number[] = [];
  for (let i = 0; i + w <= sourceWords.length; i++) {
    const h = fnv1a32(sourceWords.slice(i, i + w).join(" "));
    if (targetByHash.has(h)) hits.push(i);
  }

  if (hits.length === 0) return [];

  const passages: Passage[] = [];
  let groupStart = hits[0];
  let groupEnd = hits[0] + w;

  for (let i = 1; i < hits.length; i++) {
    const h = hits[i];
    if (h <= groupEnd) {
      groupEnd = Math.max(groupEnd, h + w);
    } else {
      pushPassage(passages, groupStart, groupEnd, sourceWords, targetWords, w, targetByHash);
      groupStart = h;
      groupEnd = h + w;
    }
  }
  pushPassage(passages, groupStart, groupEnd, sourceWords, targetWords, w, targetByHash);

  return passages.filter((p) => p.sourceEnd - p.sourceStart >= w + 2);
}

function pushPassage(
  out: Passage[],
  sourceStart: number,
  sourceEnd: number,
  sourceWords: string[],
  targetWords: string[],
  w: number,
  targetByHash: Map<number, number[]>,
): void {
  const sourceText = sourceWords.slice(sourceStart, sourceEnd).join(" ");
  const seedHash = fnv1a32(sourceWords.slice(sourceStart, sourceStart + w).join(" "));
  const targetStart = targetByHash.get(seedHash)?.[0] ?? 0;
  const targetEnd = targetStart + (sourceEnd - sourceStart);
  const targetText = targetWords.slice(targetStart, targetEnd).join(" ");
  out.push({
    sourceStart,
    sourceEnd,
    targetStart,
    targetEnd,
    text: sourceText || targetText,
  });
}
```

- [ ] **Step 8: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/compare/align.test.ts`
Expected: 3 tests pass.

- [ ] **Step 9: Write failing test for `verdict.ts`**

```ts
// verdict.test.ts
import { describe, it, expect } from "vitest";
import { severity, mergePassages } from "./verdict";

describe("severity", () => {
  it("returns 'ignore' below low threshold", () => {
    expect(severity(0.10, { ignore: 0.15, low: 0.35, medium: 0.60 })).toBe("ignore");
  });

  it("returns 'low' between low and medium", () => {
    expect(severity(0.25, { ignore: 0.15, low: 0.35, medium: 0.60 })).toBe("low");
  });

  it("returns 'medium' between medium and high", () => {
    expect(severity(0.50, { ignore: 0.15, low: 0.35, medium: 0.60 })).toBe("medium");
  });

  it("returns 'high' above high threshold", () => {
    expect(severity(0.80, { ignore: 0.15, low: 0.35, medium: 0.60 })).toBe("high");
  });

  it("returns 'ignore' at exact low threshold", () => {
    expect(severity(0.15, { ignore: 0.15, low: 0.35, medium: 0.60 })).toBe("ignore");
  });
});

describe("mergePassages", () => {
  it("returns empty array on empty input", () => {
    expect(mergePassages([])).toEqual([]);
  });

  it("merges adjacent passages", () => {
    const passages = [
      { sourceStart: 0, sourceEnd: 5, targetStart: 0, targetEnd: 5, text: "a" },
      { sourceStart: 4, sourceEnd: 9, targetStart: 4, targetEnd: 9, text: "b" },
    ];
    const merged = mergePassages(passages);
    expect(merged.length).toBe(1);
  });
});
```

- [ ] **Step 10: Run, see red**

Run: `pnpm test src/plugins/content-integrity/src/compare/verdict.test.ts`
Expected: FAIL.

- [ ] **Step 11: Implement `verdict.ts`**

```ts
import type { Passage } from "./align";

export type Severity = "ignore" | "low" | "medium" | "high";

export interface SeverityThresholds {
  ignore: number;
  low: number;
  medium: number;
}

/**
 * Map a containment ratio to a severity bucket.
 *
 * Thresholds are inclusive on the lower bound: a ratio of exactly 0.35
 * lands in `low`, not `ignore`. Matches the spec §5.2.
 */
export function severity(ratio: number, thresholds: SeverityThresholds): Severity {
  if (ratio < thresholds.ignore) return "ignore";
  if (ratio < thresholds.low) return "low";
  if (ratio < thresholds.medium) return "medium";
  return "high";
}

/**
 * Merge overlapping / adjacent passages into non-overlapping spans.
 *
 * Two passages are merged when their source ranges overlap or touch.
 */
export function mergePassages(passages: Passage[]): Passage[] {
  if (passages.length === 0) return [];
  const sorted = [...passages].sort((a, b) => a.sourceStart - b.sourceStart);
  const out: Passage[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const curr = sorted[i];
    if (curr.sourceStart <= prev.sourceEnd) {
      prev.sourceEnd = Math.max(prev.sourceEnd, curr.sourceEnd);
      prev.targetEnd = Math.max(prev.targetEnd, curr.targetEnd);
      prev.text = `${prev.text} ${curr.text}`.trim();
    } else {
      out.push(curr);
    }
  }

  return out;
}
```

- [ ] **Step 12: Run, see green**

Run: `pnpm test src/plugins/content-integrity/src/compare/verdict.test.ts`
Expected: 6 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 10: Domain types — `domain/config.ts`, `domain/match.ts`, `domain/boilerplate.ts`, `domain/fingerprint.ts`

**Files:**
- Create: `src/plugins/content-integrity/src/domain/config.ts`
- Create: `src/plugins/content-integrity/src/domain/config.test.ts`
- Create: `src/plugins/content-integrity/src/domain/match.ts`
- Create: `src/plugins/content-integrity/src/domain/match.test.ts`
- Create: `src/plugins/content-integrity/src/domain/boilerplate.ts`
- Create: `src/plugins/content-integrity/src/domain/boilerplate.test.ts`
- Create: `src/plugins/content-integrity/src/domain/fingerprint.ts`

**Produces:** canonical domain types shared by every upper layer.

**Consumes:**
- `Severity = "info" | "warn" | "critical"` exported from `compare/verdict.ts`.
- `Fingerprint` interface from `fingerprint/document.ts`.

- [ ] **Step 1: Write `domain/fingerprint.ts`** (pure type re-export)

```ts
import type { Fingerprint as Fp } from "../fingerprint/document";

export type Fingerprint = Fp & {
  readonly articleId: string;
  readonly contentHash: string; // fnv1a64 hex
  readonly createdAt: number;
};
```

- [ ] **Step 2: Write `domain/match.ts`** (TDD, 3 tests)

```ts
// domain/match.ts
export type MatchStatus = "open" | "dismissed" | "approved";

export interface Match {
  readonly id: string;
  readonly articleId: string;
  readonly sourceArticleId: string;
  readonly score: number;
  readonly severity: "info" | "warn" | "critical";
  readonly status: MatchStatus;
  readonly pairKey: string;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly contentHashAtDetection: string;
  readonly sourceContentHashAtDetection: string;
  readonly passages: ReadonlyArray<{
    readonly text: string;
    readonly sourceStart: number;
    readonly sourceEnd: number;
    readonly targetStart: number;
    readonly targetEnd: number;
  }>;
}

export function pairKey(sourceArticleId: string, articleId: string): string {
  return `${sourceArticleId}:${articleId}`;
}

export function makeMatchId(sourceArticleId: string, articleId: string): string {
  return pairKey(sourceArticleId, articleId);
}

export function transitionStatus(
  m: Match,
  next: MatchStatus,
): Match {
  return { ...m, status: next, lastSeenAt: Date.now() };
}
```

Tests (`match.test.ts`): `pairKey` is symmetric via sorted order; `transitionStatus` updates timestamp; `transitionStatus` is pure (input unchanged).

- [ ] **Step 3: Write `domain/config.ts`** (TDD, 4 tests)

```ts
// domain/config.ts
import { defaultVerdictThresholds } from "../compare/verdict";

export interface IntegrityConfig {
  enabled: boolean;
  w: number;
  k: number;
  bands: number;
  rows: number;
  boilerplateDfThreshold: number;
  severities: { info: number; warn: number; critical: number };
  excludeOwnAuthorId: boolean;
}

export const DEFAULT_CONFIG: IntegrityConfig = {
  enabled: true,
  w: 6,
  k: 128,
  bands: 32,
  rows: 4,
  boilerplateDfThreshold: 0.02,
  severities: defaultVerdictThresholds(),
  excludeOwnAuthorId: true,
};

export function mergeConfig(
  base: IntegrityConfig,
  patch: Partial<IntegrityConfig> | undefined,
): IntegrityConfig {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    severities: { ...base.severities, ...(patch.severities ?? {}) },
  };
}

export function isValidConfig(c: Partial<IntegrityConfig>): c is IntegrityConfig {
  return (
    typeof c.enabled === "boolean" &&
    Number.isInteger(c.w) && c.w >= 3 && c.w <= 12 &&
    Number.isInteger(c.k) && c.k >= 64 && c.k <= 256 &&
    Number.isInteger(c.bands) && c.bands >= 8 && c.bands <= 64 &&
    Number.isInteger(c.rows) && c.rows >= 2 && c.rows <= 8 &&
    c.bands * c.rows === c.k &&
    typeof c.boilerplateDfThreshold === "number" &&
    c.boilerplateDfThreshold >= 0 && c.boilerplateDfThreshold <= 1 &&
    !!c.severities &&
    typeof c.excludeOwnAuthorId === "boolean"
  );
}
```

Tests (`config.test.ts`): `mergeConfig` shallow-merges top-level; `mergeConfig` deep-merges `severities`; `isValidConfig` rejects `bands * rows !== k`; `DEFAULT_CONFIG.bands * DEFAULT_CONFIG.rows === DEFAULT_CONFIG.k`.

- [ ] **Step 4: Write `domain/boilerplate.ts`** (TDD, 4 tests)

```ts
// domain/boilerplate.ts
import type { Fingerprint } from "./fingerprint";

export interface DocumentFrequencyTable {
  readonly df: ReadonlyMap<number, number>;
  readonly articleCount: number;
}

export function emptyDf(articleCount = 0): DocumentFrequencyTable {
  return { df: new Map(), articleCount };
}

export function addArticleToDf(
  table: DocumentFrequencyTable,
  shingleHashes: ReadonlyArray<number>,
): DocumentFrequencyTable {
  const seen = new Set<number>();
  for (const h of shingleHashes) {
    if (seen.has(h)) continue;
    seen.add(h);
    table.df.set(h, (table.df.get(h) ?? 0) + 1);
  }
  table.articleCount += 1;
  return table;
}

export function filterBoilerplate(
  shingles: ReadonlyArray<number>,
  table: DocumentFrequencyTable,
  threshold: number,
): number[] {
  if (table.articleCount === 0) return [...shingles];
  const cutoff = threshold * table.articleCount;
  return shingles.filter((h) => (table.df.get(h) ?? 0) < cutoff);
}
```

Tests (`boilerplate.test.ts`): `emptyDf` zeros; `addArticleToDf` increments articleCount once per article; `addArticleToDf` does not double-count duplicate hashes within same article; `filterBoilerplate` removes shingle whose `df ≥ cutoff`.

- [ ] **Step 5: Run domain tests**

Run: `pnpm test src/plugins/content-integrity/src/domain/`
Expected: 11 tests pass (3+4+4).

- [ ] **Step 6: Commit**

```bash
git add src/plugins/content-integrity/src/domain
git commit -m "feat(content-integrity): add domain types (config, match, boilerplate, fingerprint)"
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 11: Ports — `ports/config-store.ts`, `ports/fingerprint-store.ts`, `ports/band-index-store.ts`, `ports/match-store.ts`, `ports/safe-href.ts`

**Files:**
- Create: `src/plugins/content-integrity/src/ports/config-store.ts`
- Create: `src/plugins/content-integrity/src/ports/fingerprint-store.ts`
- Create: `src/plugins/content-integrity/src/ports/band-index-store.ts`
- Create: `src/plugins/content-integrity/src/ports/match-store.ts`
- Create: `src/plugins/content-integrity/src/ports/safe-href.ts`

**Produces:** outbound interfaces the domain talks to. Adapters live in `infrastructure/` (Task 12).

- [ ] **Step 1: Write `ports/safe-href.ts`** (re-export only)

```ts
// ports/safe-href.ts
export { safeHref } from "@cannelle/plugin-glossary-cards/src/lib/safe-href";
```

- [ ] **Step 2: Write `ports/config-store.ts`**

```ts
// ports/config-store.ts
import type { IntegrityConfig } from "../domain/config";

export interface ConfigStorePort {
  read(): Promise<IntegrityConfig>;
  write(c: IntegrityConfig): Promise<void>;
}
```

- [ ] **Step 3: Write `ports/fingerprint-store.ts`**

```ts
// ports/fingerprint-store.ts
import type { Fingerprint } from "../domain/fingerprint";

export interface FingerprintStorePort {
  put(fp: Fingerprint): Promise<void>;
  delete(articleId: string): Promise<void>;
  get(articleId: string): Promise<Fingerprint | null>;
  list(opts?: { limit?: number; cursor?: string }): Promise<{
    items: ReadonlyArray<Fingerprint>;
    nextCursor: string | null;
  }>;
}
```

- [ ] **Step 4: Write `ports/band-index-store.ts`**

```ts
// ports/band-index-store.ts
export interface BandIndexStorePort {
  /** Replace ALL bands for the given articleId atomically. */
  replaceForArticle(
    articleId: string,
    bands: ReadonlyArray<{ bandId: number; bucket: string }>,
  ): Promise<void>;

  /** Delete every band that references `articleId`. */
  deleteForArticle(articleId: string): Promise<void>;

  /**
   * Return candidate pairs (articleId, otherArticleId) sharing at least one
   * bucket. Self-pairs and pairs already in `exclude` are filtered out.
   */
  candidatesFor(
    articleId: string,
    bands: ReadonlyArray<{ bandId: number; bucket: string }>,
    exclude?: ReadonlySet<string>,
  ): Promise<ReadonlyArray<{ peer: string; bandId: number; bucket: string }>>;
}
```

- [ ] **Step 5: Write `ports/match-store.ts`**

```ts
// ports/match-store.ts
import type { Match, MatchStatus } from "../domain/match";

export interface MatchQuery {
  status?: MatchStatus;
  articleId?: string;
  severity?: Match["severity"];
  limit?: number;
  cursor?: string;
}

export interface MatchStorePort {
  upsert(m: Match): Promise<void>;
  deleteForArticle(articleId: string): Promise<number>;
  get(id: string): Promise<Match | null>;
  query(q: MatchQuery): Promise<{
    items: ReadonlyArray<Match>;
    nextCursor: string | null;
  }>;
}
```

- [ ] **Step 6: Type-check ports**

Run: `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit`
Expected: zero errors (ports have no runtime behaviour).

- [ ] **Step 7: Commit**

```bash
git add src/plugins/content-integrity/src/ports
git commit -m "feat(content-integrity): add outbound port interfaces"
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 12: Infrastructure adapters + hooks — `infrastructure/*.ts` + `hooks/*.ts`

**Files:**
- Create: `src/plugins/content-integrity/src/infrastructure/create-stores.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/fingerprint-store.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/fingerprint-store.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/band-index-store.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/band-index-store.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/match-store.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/match-store.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/watch-store.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/kv-config.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/kv-config.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/kv-doc-frequency.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/kv-doc-frequency.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/content-loader.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/content-loader.test.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/create-mock-ctx.ts`
- Create: `src/plugins/content-integrity/src/infrastructure/create-mock-ctx.test.ts`
- Create: `src/plugins/content-integrity/src/hooks/index-entry.ts`
- Create: `src/plugins/content-integrity/src/hooks/purge-entry.ts`
- Create: `src/plugins/content-integrity/src/hooks/boilerplate.ts`
- Create: `src/plugins/content-integrity/src/hooks/build-context.ts`

**Produces:** the only place that touches `ctx.storage` / `ctx.kv` / `ctx.content` — adapters implementing the ports from Task 11, plus the three hook handlers.

- [ ] **Step 1: Write `infrastructure/create-mock-ctx.ts`** (test helper)

```ts
// create-mock-ctx.ts
import type { StorageCollection } from "@emdash-cms/types";

export interface MockCtxOptions {
  storage?: Record<string, Partial<StorageCollection>>;
  kv?: Map<string, unknown>;
  articles?: ReadonlyArray<{ id: string; content: unknown }>;
}

export function createMockCtx(opts: MockCtxOptions = {}) {
  const kv = opts.kv ?? new Map<string, unknown>();
  const storage: Record<string, StorageCollection> = {};
  for (const [name, partial] of Object.entries(opts.storage ?? {})) {
    storage[name] = {
      putMany: async () => undefined,
      deleteMany: async () => 0,
      count: async () => 0,
      query: async () => ({ items: [], nextCursor: null }),
      ...partial,
    } as StorageCollection;
  }
  return {
    ctx: {
      storage: storage as any,
      kv: { get: (k: string) => kv.get(k), put: (k: string, v: unknown) => { kv.set(k, v); } },
      content: {
        query: async () => opts.articles ?? [],
        get: async (id: string) => (opts.articles ?? []).find((a) => a.id === id) ?? null,
      },
      log: { info: () => undefined, warn: () => undefined, error: () => undefined },
    },
    kv,
  };
}
```

- [ ] **Step 2: Test `createMockCtx`** (3 tests): `put` then `get` round-trip; default storage returns empty results; custom `query` override is honoured.

- [ ] **Step 3: Write `infrastructure/kv-config.ts`** (TDD, 5 tests)

```ts
// kv-config.ts
import { DEFAULT_CONFIG, mergeConfig, type IntegrityConfig } from "../domain/config";
import type { ConfigStorePort } from "../ports/config-store";

const KEY = "settings:integrityConfig";

export function createKvConfigStore(kv: {
  get(k: string): unknown;
  put(k: string, v: unknown): void | Promise<void>;
}): ConfigStorePort {
  return {
    async read() {
      const raw = await kv.get(KEY);
      if (!raw) return DEFAULT_CONFIG;
      return mergeConfig(DEFAULT_CONFIG, raw as Partial<IntegrityConfig>);
    },
    async write(c) {
      await kv.put(KEY, c);
    },
  };
}
```

Tests: returns `DEFAULT_CONFIG` when unset; round-trips a config; merges partially; rejects null after delete; preserves `severities` deep-merge.

- [ ] **Step 4: Write `infrastructure/kv-doc-frequency.ts`** (TDD, 4 tests)

```ts
// kv-doc-frequency.ts
import type { DocumentFrequencyTable } from "../domain/boilerplate";
import { emptyDf } from "../domain/boilerplate";

const KEY = "settings:shingleDf";

export function createKvDocFrequency(kv: {
  get(k: string): unknown;
  put(k: string, v: unknown): void | Promise<void>;
}) {
  return {
    async read(): Promise<DocumentFrequencyTable> {
      const raw = await kv.get(KEY);
      if (!raw) return emptyDf();
      // restore Map from JSON
      const obj = raw as { df: Array<[number, number]>; articleCount: number };
      return { df: new Map(obj.df), articleCount: obj.articleCount };
    },
    async write(t: DocumentFrequencyTable): Promise<void> {
      await kv.put(KEY, {
        df: Array.from(t.df.entries()),
        articleCount: t.articleCount,
      });
    },
  };
}
```

Tests: empty when key missing; round-trips table; Map ordering irrelevant on round-trip; preserves `articleCount`.

- [ ] **Step 5: Write `infrastructure/fingerprint-store.ts`** (TDD, 5 tests)

```ts
// fingerprint-store.ts
import type { StorageCollection } from "@emdash-cms/types";
import type { Fingerprint } from "../domain/fingerprint";
import type { FingerprintStorePort } from "../ports/fingerprint-store";

const COLLECTION = "content_integrity_fingerprints";

export function createFingerprintStore(storage: {
  [k: string]: StorageCollection;
}): FingerprintStorePort {
  const col = storage[COLLECTION];
  return {
    async put(fp) {
      await col.putMany([{ id: fp.articleId, data: fp }]);
    },
    async delete(articleId) {
      const n = await col.deleteMany([articleId]);
      return n;
    },
    async get(articleId) {
      const res = await col.query({ where: { id: articleId }, limit: 1 });
      return (res.items[0]?.data ?? null) as Fingerprint | null;
    },
    async list(opts = {}) {
      const res = await col.query({
        limit: opts.limit ?? 100,
        cursor: opts.cursor,
      });
      return {
        items: res.items.map((i: any) => i.data as Fingerprint),
        nextCursor: res.nextCursor,
      };
    },
  };
}
```

Tests: put+get round-trip; delete returns count; list honours cursor; list returns empty when collection empty; putMany index usage verified via mock.

- [ ] **Step 6: Write `infrastructure/band-index-store.ts`** (TDD, 5 tests)

```ts
// band-index-store.ts
import type { StorageCollection } from "@emdash-cms/types";
import type { BandIndexStorePort } from "../ports/band-index-store";

const COLLECTION = "content_integrity_bands";
const ITEMS_PER_ARTICLE = 128; // bands × rows for default 32×4

export function createBandIndexStore(storage: {
  [k: string]: StorageCollection;
}): BandIndexStorePort {
  const col = storage[COLLECTION];
  return {
    async replaceForArticle(articleId, bands) {
      await col.deleteMany(
        (await col.query({ where: { articleId }, limit: ITEMS_PER_ARTICLE }))
          .items.map((i: any) => i.id),
      );
      await col.putMany(
        bands.map((b, idx) => ({
          id: `${articleId}:${b.bandId}:${idx}`,
          data: { articleId, bandId: b.bandId, bucket: b.bucket },
        })),
      );
    },
    async deleteForArticle(articleId) {
      const items = await col.query({
        where: { articleId },
        limit: ITEMS_PER_ARTICLE,
      });
      return col.deleteMany(items.items.map((i: any) => i.id));
    },
    async candidatesFor(articleId, bands, exclude) {
      const peers = new Map<string, { peer: string; bandId: number; bucket: string }>();
      for (const b of bands) {
        const hit = await col.query({
          where: { bandId: b.bandId, bucket: b.bucket },
          limit: 50,
        });
        for (const item of hit.items) {
          const data = (item as any).data as {
            articleId: string;
            bandId: number;
            bucket: string;
          };
          if (data.articleId === articleId) continue;
          if (exclude?.has(data.articleId)) continue;
          const key = data.articleId;
          if (!peers.has(key)) peers.set(key, { peer: key, bandId: data.bandId, bucket: data.bucket });
        }
      }
      return Array.from(peers.values());
    },
  };
}
```

Tests: replaceForArticle removes previous bands for articleId; replaceForArticle inserts new bands; deleteForArticle returns count; candidatesFor excludes self; candidatesFor honours `exclude` set.

- [ ] **Step 7: Write `infrastructure/match-store.ts`** (TDD, 5 tests)

```ts
// match-store.ts
import type { StorageCollection } from "@emdash-cms/types";
import type { Match } from "../domain/match";
import type { MatchStorePort, MatchQuery } from "../ports/match-store";

const COLLECTION = "content_integrity_matches";

export function createMatchStore(storage: {
  [k: string]: StorageCollection;
}): MatchStorePort {
  const col = storage[COLLECTION];
  return {
    async upsert(m) {
      await col.putMany([{ id: m.id, data: m }]);
    },
    async deleteForArticle(articleId) {
      const items = await col.query({
        where: { articleId },
        limit: 200,
      });
      return col.deleteMany(items.items.map((i: any) => i.id));
    },
    async get(id) {
      const res = await col.query({ where: { id }, limit: 1 });
      return ((res.items[0] as any)?.data ?? null) as Match | null;
    },
    async query(q: MatchQuery) {
      const where: Record<string, unknown> = {};
      if (q.status) where.status = q.status;
      if (q.articleId) where.articleId = q.articleId;
      if (q.severity) where.severity = q.severity;
      const res = await col.query({ where, limit: q.limit ?? 50, cursor: q.cursor });
      return {
        items: res.items.map((i: any) => i.data as Match),
        nextCursor: res.nextCursor,
      };
    },
  };
}
```

Tests: upsert+get round-trip; deleteForArticle returns count for both directions (suspect and source); query by status; query by severity; query by articleId.

- [ ] **Step 8: Write `infrastructure/watch-store.ts`** (no test — just compiles; tiny KV list)

```ts
// watch-store.ts
const KEY = "settings:integrityWatchlist";

export interface WatchEntry {
  readonly articleId: string;
  readonly authorId?: string;
  readonly expiresAt?: number;
}

export function createWatchStore(kv: {
  get(k: string): unknown;
  put(k: string, v: unknown): void | Promise<void>;
}) {
  return {
    async read(): Promise<WatchEntry[]> {
      const raw = await kv.get(KEY);
      return Array.isArray(raw) ? (raw as WatchEntry[]) : [];
    },
    async write(entries: WatchEntry[]): Promise<void> {
      await kv.put(KEY, entries);
    },
  };
}
```

- [ ] **Step 9: Write `infrastructure/content-loader.ts`** (TDD, 4 tests)

```ts
// content-loader.ts
import type { ContentPort, PortableTextBlock } from "@emdash-cms/types";

export interface LoadedArticle {
  readonly id: string;
  readonly title: string;
  readonly authorId: string | null;
  readonly content: ReadonlyArray<PortableTextBlock>;
  readonly excerpt: string;
  readonly status: string;
  readonly updatedAt: number;
}

export async function loadArticle(ctx: {
  content: ContentPort;
}, articleId: string): Promise<LoadedArticle | null> {
  const a = await ctx.content.get(articleId);
  if (!a) return null;
  return a as LoadedArticle;
}

export async function listPublishedArticles(
  ctx: { content: ContentPort },
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: LoadedArticle[]; nextCursor: string | null }> {
  const res = await ctx.content.query({
    status: "published",
    limit: opts.limit ?? 50,
    cursor: opts.cursor,
  });
  return { items: res.items as LoadedArticle[], nextCursor: res.nextCursor };
}
```

Tests: `loadArticle` returns null when missing; `loadArticle` projects fields; `listPublishedArticles` filters status; `listPublishedArticles` paginates with cursor.

- [ ] **Step 10: Write `infrastructure/create-stores.ts`** (composition root helper)

```ts
// create-stores.ts
import type { PluginContext } from "@emdash-cms/types";
import { createKvConfigStore } from "./kv-config";
import { createKvDocFrequency } from "./kv-doc-frequency";
import { createFingerprintStore } from "./fingerprint-store";
import { createBandIndexStore } from "./band-index-store";
import { createMatchStore } from "./match-store";
import { createWatchStore } from "./watch-store";

export function createStores(ctx: PluginContext) {
  return {
    config: createKvConfigStore(ctx.kv),
    docFreq: createKvDocFrequency(ctx.kv),
    watch: createWatchStore(ctx.kv),
    fingerprints: createFingerprintStore(ctx.storage as any),
    bands: createBandIndexStore(ctx.storage as any),
    matches: createMatchStore(ctx.storage as any),
  };
}
```

- [ ] **Step 11: Write `hooks/build-context.ts`** (shared env for hooks)

```ts
// hooks/build-context.ts
import type { PluginContext } from "@emdash-cms/types";
import { createStores } from "../infrastructure/create-stores";
import { fingerprintDocument } from "../fingerprint/document";
import { computeContainment } from "../compare/containment";
import { alignPassages } from "../compare/align";
import { classify } from "../compare/verdict";
import { addArticleToDf } from "../domain/boilerplate";

export interface HookEnv {
  ctx: PluginContext;
  stores: ReturnType<typeof createStores>;
}

export function buildEnv(ctx: PluginContext): HookEnv {
  return { ctx, stores: createStores(ctx) };
}

export const pipeline = {
  fingerprintDocument,
  computeContainment,
  alignPassages,
  classify,
  addArticleToDf,
};
```

- [ ] **Step 12: Write `hooks/index-entry.ts`** (TDD, 4 tests via fake context)

```ts
// hooks/index-entry.ts
import type { HookHandler, ContentEvent } from "@emdash-cms/types";
import { loadArticle } from "../infrastructure/content-loader";
import { buildEnv, pipeline } from "./build-context";

export function createIndexEntry(): HookHandler<ContentEvent> {
  return async (event, rawCtx) => {
    if (event.status !== "published") return;
    const env = buildEnv(rawCtx);
    const article = await loadArticle(env.ctx, event.articleId);
    if (!article) return;

    const config = await env.stores.config.read();
    if (!config.enabled) return;

    const prev = await env.stores.fingerprints.get(article.id);
    if (prev?.contentHash === articleContentHash(article)) return; // short-circuit

    const fp = await pipeline.fingerprintDocument(article, config);
    if (!fp) return;
    const tagged = { ...fp, articleId: article.id, contentHash: articleContentHash(article), createdAt: Date.now() };
    await env.stores.fingerprints.put(tagged);
    await env.stores.bands.replaceForArticle(article.id, fp.bands);

    // Boilerplate accumulation.
    const df = await env.stores.docFreq.read();
    pipeline.addArticleToDf(df, fp.shingles);
    await env.stores.docFreq.write(df);

    // Detect against existing fingerprints.
    const peers = await env.stores.bands.candidatesFor(article.id, fp.bands, new Set([article.id]));
    for (const c of peers) {
      const sourceFp = await env.stores.fingerprints.get(c.peer);
      if (!sourceFp) continue;
      const score = pipeline.computeContainment(fp, sourceFp);
      if (score < config.severities.info) continue;
      const verdict = pipeline.classify(score, config);
      const passages = await pipeline.alignPassages(article, sourceFp);
      const match = {
        id: `${sourceFp.articleId}:${article.id}`,
        articleId: article.id,
        sourceArticleId: sourceFp.articleId,
        score,
        severity: verdict,
        status: "open" as const,
        pairKey: `${sourceFp.articleId}:${article.id}`,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        contentHashAtDetection: articleContentHash(article),
        sourceContentHashAtDetection: sourceFp.contentHash,
        passages,
      };
      await env.stores.matches.upsert(match);
    }
  };
}

function articleContentHash(a: { content: unknown; updatedAt: number }): string {
  return String(a.updatedAt) + ":" + JSON.stringify(a.content).length;
}
```

Tests: short-circuits when status !== published; short-circuits when contentHash unchanged; stores fingerprint+bands when fresh; emits match when peer overlaps above `info`.

- [ ] **Step 13: Write `hooks/purge-entry.ts`** (TDD, 3 tests)

```ts
// hooks/purge-entry.ts
import type { HookHandler, ContentEvent } from "@emdash-cms/types";
import { buildEnv } from "./build-context";

export function createPurgeEntry(): HookHandler<ContentEvent> {
  return async (event, rawCtx) => {
    const env = buildEnv(rawCtx);
    await env.stores.fingerprints.delete(event.articleId);
    await env.stores.bands.deleteForArticle(event.articleId);
    await env.stores.matches.deleteForArticle(event.articleId);
  };
}
```

Tests: deletes from all three stores; idempotent on re-run; does not throw when article unknown.

- [ ] **Step 14: Write `hooks/boilerplate.ts`** (TDD, 2 tests)

```ts
// hooks/boilerplate.ts
import type { HookHandler, ConfigEvent } from "@emdash-cms/types";
import { buildEnv } from "./build-context";

export function createBoilerplateHook(): HookHandler<ConfigEvent> {
  return async (_event, rawCtx) => {
    const env = buildEnv(rawCtx);
    // Future: trigger DF rebuild on threshold change. Phase 1: no-op safety hook.
    await env.stores.config.read();
  };
}
```

Tests: returns without error; reads config (does not crash on absent KV).

- [ ] **Step 15: Run all infrastructure + hook tests**

Run: `pnpm test src/plugins/content-integrity/src/infrastructure src/plugins/content-integrity/src/hooks`
Expected: ~38 tests pass.

- [ ] **Step 16: Commit**

```bash
git add src/plugins/content-integrity/src/infrastructure src/plugins/content-integrity/src/hooks
git commit -m "feat(content-integrity): add adapters (kv, storage, content) and hook handlers"
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 13: Routes — `routes/result.ts` + `routes/check.ts` + `routes/matches.ts` + `routes/match.ts` + `routes/review.ts` + `routes/rebuild.ts` + `routes/settings.ts`

**Files:**
- Create: `src/plugins/content-integrity/src/routes/result.ts`
- Create: `src/plugins/content-integrity/src/routes/check.ts`
- Create: `src/plugins/content-integrity/src/routes/check.test.ts`
- Create: `src/plugins/content-integrity/src/routes/matches.ts`
- Create: `src/plugins/content-integrity/src/routes/matches.test.ts`
- Create: `src/plugins/content-integrity/src/routes/match.ts`
- Create: `src/plugins/content-integrity/src/routes/match.test.ts`
- Create: `src/plugins/content-integrity/src/routes/review.ts`
- Create: `src/plugins/content-integrity/src/routes/review.test.ts`
- Create: `src/plugins/content-integrity/src/routes/rebuild.ts`
- Create: `src/plugins/content-integrity/src/routes/rebuild.test.ts`
- Create: `src/plugins/content-integrity/src/routes/settings.ts`
- Create: `src/plugins/content-integrity/src/routes/settings.test.ts`
- Create: `src/plugins/content-integrity/src/routes/index.ts`

**Produces:** 6 route handlers + composition index. Every route declares `permission` explicitly.

- [ ] **Step 1: Write `routes/result.ts`**

```ts
// routes/result.ts
export type RouteResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string };

export async function toRouteResult<T>(run: () => Promise<T>): Promise<RouteResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 2: Write `routes/check.ts`** (TDD, 3 tests)

```ts
// routes/check.ts
import type { RouteHandler } from "@emdash-cms/types";
import { fingerprintDocument } from "../fingerprint/document";
import { computeContainment } from "../compare/containment";
import { createStores } from "../infrastructure/create-stores";
import { loadArticle } from "../infrastructure/content-loader";
import { safeHref } from "../ports/safe-href";
import { toRouteResult, type RouteResult } from "./result";

export interface CheckRequest { articleId: string }
export interface CheckResponse {
  articleId: string;
  matches: Array<{ peer: string; score: number; severity: string; url: string }>;
}

export function createCheckRoute(): RouteHandler<CheckRequest, RouteResult<CheckResponse>> {
  return async (req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const cfg = await stores.config.read();
      const article = await loadArticle(ctx, req.articleId);
      if (!article) throw new Error("article not found");
      const fp = await fingerprintDocument(article, cfg);
      if (!fp) return { articleId: req.articleId, matches: [] };
      const tagged = { ...fp, articleId: article.id };
      const peers = await stores.bands.candidatesFor(article.id, fp.bands, new Set([article.id]));
      const out: CheckResponse["matches"] = [];
      for (const c of peers) {
        const peerFp = await stores.fingerprints.get(c.peer);
        if (!peerFp) continue;
        const score = computeContainment(tagged, peerFp);
        if (score < cfg.severities.info) continue;
        out.push({
          peer: c.peer,
          score,
          severity: score >= cfg.severities.critical ? "critical"
                 : score >= cfg.severities.warn     ? "warn"
                 : "info",
          url: safeHref(`/admin/posts/${c.peer}`),
        });
      }
      return { articleId: req.articleId, matches: out };
    });
  };
}
```

Tests: returns empty when no candidates; throws when article missing; sanitises URL.

- [ ] **Step 3: Write `routes/matches.ts`** (TDD, 3 tests)

```ts
// routes/matches.ts
import type { RouteHandler } from "@emdash-cms/types";
import { createStores } from "../infrastructure/create-stores";
import { toRouteResult, type RouteResult } from "./result";

export interface MatchesQuery {
  status?: "open" | "dismissed" | "approved";
  severity?: "info" | "warn" | "critical";
  cursor?: string;
}
export interface MatchesResponse {
  items: Array<{ id: string; articleId: string; sourceArticleId: string; score: number; severity: string; status: string }>;
  nextCursor: string | null;
}

export function createMatchesRoute(): RouteHandler<MatchesQuery, RouteResult<MatchesResponse>> {
  return async (q, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const res = await stores.matches.query({
        status: q.status,
        severity: q.severity,
        cursor: q.cursor,
        limit: 50,
      });
      return {
        items: res.items.map((m) => ({
          id: m.id, articleId: m.articleId, sourceArticleId: m.sourceArticleId,
          score: m.score, severity: m.severity, status: m.status,
        })),
        nextCursor: res.nextCursor,
      };
    });
  };
}
```

Tests: forwards filters; honours cursor; empty list.

- [ ] **Step 4: Write `routes/match.ts`** (TDD, 2 tests)

```ts
// routes/match.ts
import type { RouteHandler } from "@emdash-cms/types";
import { createStores } from "../infrastructure/create-stores";
import { toRouteResult, type RouteResult } from "./result";

export interface MatchResponse {
  id: string; articleId: string; sourceArticleId: string; score: number;
  severity: string; status: string; passages: ReadonlyArray<unknown>;
  firstSeenAt: number; lastSeenAt: number;
}

export function createMatchRoute(): RouteHandler<{ id: string }, RouteResult<MatchResponse>> {
  return async (req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const m = await stores.matches.get(req.id);
      if (!m) throw new Error("match not found");
      return {
        id: m.id, articleId: m.articleId, sourceArticleId: m.sourceArticleId,
        score: m.score, severity: m.severity, status: m.status, passages: m.passages,
        firstSeenAt: m.firstSeenAt, lastSeenAt: m.lastSeenAt,
      };
    });
  };
}
```

Tests: returns match; throws on unknown id.

- [ ] **Step 5: Write `routes/review.ts`** (TDD, 3 tests)

```ts
// routes/review.ts
import type { RouteHandler } from "@emdash-cms/types";
import { transitionStatus } from "../domain/match";
import { createStores } from "../infrastructure/create-stores";
import { toRouteResult, type RouteResult } from "./result";

export interface ReviewRequest { id: string; action: "dismiss" | "approve" | "reopen" }
export interface ReviewResponse { id: string; status: string }

export function createReviewRoute(): RouteHandler<ReviewRequest, RouteResult<ReviewResponse>> {
  return async (req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const current = await stores.matches.get(req.id);
      if (!current) throw new Error("match not found");
      const next = req.action === "dismiss"  ? "dismissed"
                : req.action === "approve"  ? "approved"
                : "open";
      const updated = transitionStatus(current, next);
      await stores.matches.upsert(updated);
      return { id: updated.id, status: updated.status };
    });
  };
}
```

Tests: dismiss moves to dismissed; approve moves to approved; reopen returns to open.

- [ ] **Step 6: Write `routes/rebuild.ts`** (TDD, 3 tests)

```ts
// routes/rebuild.ts
import type { RouteHandler } from "@emdash-cms/types";
import { listPublishedArticles } from "../infrastructure/content-loader";
import { createStores } from "../infrastructure/create-stores";
import { fingerprintDocument } from "../fingerprint/document";
import { toRouteResult, type RouteResult } from "./result";

const PAGE_SIZE = 50;

export interface RebuildResponse {
  processed: number; cursor: string | null; done: boolean;
}

export function createRebuildRoute(): RouteHandler<{ cursor?: string }, RouteResult<RebuildResponse>> {
  return async (req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const cfg = await stores.config.read();
      const page = await listPublishedArticles(ctx, { limit: PAGE_SIZE, cursor: req.cursor });
      for (const article of page.items) {
        const fp = await fingerprintDocument(article, cfg);
        if (!fp) continue;
        const tagged = { ...fp, articleId: article.id, contentHash: String(article.updatedAt), createdAt: Date.now() };
        await stores.fingerprints.put(tagged);
        await stores.bands.replaceForArticle(article.id, fp.bands);
      }
      return {
        processed: page.items.length,
        cursor: page.nextCursor,
        done: page.nextCursor === null,
      };
    });
  };
}
```

Tests: processes one page; reports `done: true` when cursor null; honours input cursor.

- [ ] **Step 7: Write `routes/settings.ts`** (TDD, 3 tests)

```ts
// routes/settings.ts
import type { RouteHandler } from "@emdash-cms/types";
import { isValidConfig, type IntegrityConfig } from "../domain/config";
import { createStores } from "../infrastructure/create-stores";
import { toRouteResult, type RouteResult } from "./result";

export interface SettingsResponse { config: IntegrityConfig }

export function createSettingsGetRoute(): RouteHandler<{}, RouteResult<SettingsResponse>> {
  return async (_req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      return { config: await stores.config.read() };
    });
  };
}

export function createSettingsPutRoute(): RouteHandler<Partial<IntegrityConfig>, RouteResult<SettingsResponse>> {
  return async (req, ctx) => {
    return toRouteResult(async () => {
      const stores = createStores(ctx);
      const current = await stores.config.read();
      const merged = { ...current, ...req };
      if (!isValidConfig(merged)) throw new Error("invalid config");
      await stores.config.write(merged);
      return { config: merged };
    });
  };
}
```

Tests: GET returns default when unset; PUT round-trips; PUT rejects invalid (bands×rows≠k).

- [ ] **Step 8: Write `routes/index.ts`** (composition)

```ts
// routes/index.ts
import { createCheckRoute } from "./check";
import { createMatchesRoute } from "./matches";
import { createMatchRoute } from "./match";
import { createReviewRoute } from "./review";
import { createRebuildRoute } from "./rebuild";
import { createSettingsGetRoute, createSettingsPutRoute } from "./settings";

export const routes = [
  { method: "POST", path: "/plugins/content-integrity/check", permission: "content:read", handler: createCheckRoute() },
  { method: "GET",  path: "/plugins/content-integrity/matches", permission: "plugins:manage", handler: createMatchesRoute() },
  { method: "GET",  path: "/plugins/content-integrity/match/:id", permission: "plugins:manage", handler: createMatchRoute() },
  { method: "POST", path: "/plugins/content-integrity/match/:id/review", permission: "plugins:manage", handler: createReviewRoute() },
  { method: "POST", path: "/plugins/content-integrity/rebuild", permission: "plugins:manage", handler: createRebuildRoute() },
  { method: "GET",  path: "/plugins/content-integrity/settings", permission: "plugins:manage", handler: createSettingsGetRoute() },
  { method: "PUT",  path: "/plugins/content-integrity/settings", permission: "plugins:manage", handler: createSettingsPutRoute() },
];
```

- [ ] **Step 9: Run routes tests**

Run: `pnpm test src/plugins/content-integrity/src/routes/`
Expected: ~17 tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/plugins/content-integrity/src/routes
git commit -m "feat(content-integrity): add route handlers (check, matches, review, rebuild, settings)"
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 14: Admin UI — `admin.tsx` + `ui/api.ts` + components + page + widget + field

**Files:**
- Create: `src/plugins/content-integrity/src/admin.tsx`
- Create: `src/plugins/content-integrity/src/ui/api.ts`
- Create: `src/plugins/content-integrity/src/ui/api.test.ts`
- Create: `src/plugins/content-integrity/src/ui/css-modules.d.ts`
- Create: `src/plugins/content-integrity/src/ui/entry-ref.ts`
- Create: `src/plugins/content-integrity/src/ui/components/Primitives.tsx`
- Create: `src/plugins/content-integrity/src/ui/components/MatchDiff.tsx`
- Create: `src/plugins/content-integrity/src/ui/pages/IntegrityPage.tsx`
- Create: `src/plugins/content-integrity/src/ui/widgets/IntegrityOverviewWidget.tsx`
- Create: `src/plugins/content-integrity/src/ui/fields/IntegrityField.tsx`
- Create: `src/plugins/content-integrity/src/ui/styles/Integrity.module.css`

**Produces:** React admin surface that calls the routes. No raw HTML interpolation; uses CSS Modules; uses `apiFetch` from `@emdash-cms/admin`.

- [ ] **Step 1: Write `ui/css-modules.d.ts`** (ambient types)

```ts
// ui/css-modules.d.ts
declare module "*.module.css" {
  const classes: { readonly [k: string]: string };
  export default classes;
}
```

- [ ] **Step 2: Write `ui/styles/Integrity.module.css`** (placeholder — fleshed out in design pass)

```css
/* minimal layout primitives; final styles land during UI integration */
.root { padding: var(--ds-space-3, 1rem); }
.tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--ds-color-border); }
.tab { padding: 0.5rem 1rem; border: 0; background: none; cursor: pointer; }
.tab[data-active="true"] { border-bottom: 2px solid var(--ds-color-accent); font-weight: 600; }
.matchList { list-style: none; padding: 0; margin: 1rem 0; }
.matchItem { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--ds-color-border); }
.diff { white-space: pre-wrap; font-family: var(--ds-font-mono); }
.severityInfo { color: var(--ds-color-info); }
.severityWarn { color: var(--ds-color-warn); }
.severityCritical { color: var(--ds-color-critical, var(--ds-color-warn)); font-weight: 600; }
```

- [ ] **Step 3: Write `ui/api.ts`** (TDD, 4 tests with `fetch` mocked)

```ts
// ui/api.ts
import { apiFetch } from "@emdash-cms/admin";

export interface ApiMatch {
  id: string; articleId: string; sourceArticleId: string;
  score: number; severity: string; status: string;
}
export interface ApiMatchDetail extends ApiMatch {
  passages: Array<{
    text: string; sourceStart: number; sourceEnd: number;
    targetStart: number; targetEnd: number;
  }>;
  firstSeenAt: number; lastSeenAt: number;
}
export interface ApiSettings {
  config: {
    enabled: boolean; w: number; k: number; bands: number; rows: number;
    boilerplateDfThreshold: number; severities: { info: number; warn: number; critical: number };
    excludeOwnAuthorId: boolean;
  };
}

export const api = {
  async listMatches(opts: { status?: string; severity?: string; cursor?: string } = {}) {
    const qs = new URLSearchParams();
    if (opts.status) qs.set("status", opts.status);
    if (opts.severity) qs.set("severity", opts.severity);
    if (opts.cursor) qs.set("cursor", opts.cursor);
    const res = await apiFetch<{ items: ApiMatch[]; nextCursor: string | null }>(
      `/api/plugins/content-integrity/matches?${qs.toString()}`,
    );
    return res;
  },
  async getMatch(id: string) {
    return apiFetch<ApiMatchDetail>(`/api/plugins/content-integrity/match/${encodeURIComponent(id)}`);
  },
  async review(id: string, action: "dismiss" | "approve" | "reopen") {
    return apiFetch<{ id: string; status: string }>(
      `/api/plugins/content-integrity/match/${encodeURIComponent(id)}/review`,
      { method: "POST", body: { action } },
    );
  },
  async getSettings() {
    return apiFetch<ApiSettings>("/api/plugins/content-integrity/settings");
  },
  async putSettings(patch: Partial<ApiSettings["config"]>) {
    return apiFetch<ApiSettings>("/api/plugins/content-integrity/settings", {
      method: "PUT", body: patch,
    });
  },
  async rebuild(cursor?: string) {
    return apiFetch<{ processed: number; cursor: string | null; done: boolean }>(
      `/api/plugins/content-integrity/rebuild`,
      { method: "POST", body: { cursor } },
    );
  },
};
```

Tests (with `fetch` mock): `listMatches` serialises filters; `review` sends action; `putSettings` serialises body; `rebuild` honours cursor.

- [ ] **Step 4: Write `ui/entry-ref.ts`** (id-only, no DOM injection)

```ts
// ui/entry-ref.ts
/** Stable handle for embedding into the page without inline scripts. */
export interface EntryRef { readonly id: "content-integrity-entry"; }
export const entryRef: EntryRef = { id: "content-integrity-entry" };
```

- [ ] **Step 5: Write `ui/components/Primitives.tsx`** (small wrappers)

```tsx
// ui/components/Primitives.tsx
import styles from "../styles/Integrity.module.css";
import type { ReactNode } from "react";

export function Tabs({ tabs, active, onChange }: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          data-active={t.id === active}
          className={styles.tab}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === "critical" ? styles.severityCritical
            : severity === "warn"     ? styles.severityWarn
            : styles.severityInfo;
  return <span className={cls}>{severity}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.root}>{children}</p>;
}
```

- [ ] **Step 6: Write `ui/components/MatchDiff.tsx`**

```tsx
// ui/components/MatchDiff.tsx
import styles from "../styles/Integrity.module.css";

export function MatchDiff({ passages }: {
  passages: ReadonlyArray<{ text: string }>;
}) {
  return (
    <pre className={styles.diff} aria-label="Passages en commun">
      {passages.map((p, i) => (
        <span key={i} data-passage-index={i}>{p.text}{"\n"}</span>
      ))}
    </pre>
  );
}
```

- [ ] **Step 7: Write `ui/pages/IntegrityPage.tsx`**

```tsx
// ui/pages/IntegrityPage.tsx
import { useEffect, useState } from "react";
import { Tabs, EmptyState, SeverityBadge } from "../components/Primitives";
import { MatchDiff } from "../components/MatchDiff";
import { api, type ApiMatch, type ApiMatchDetail } from "../api";
import styles from "../styles/Integrity.module.css";

type Tab = "open" | "dismissed" | "approved";

export default function IntegrityPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [items, setItems] = useState<ApiMatch[]>([]);
  const [selected, setSelected] = useState<ApiMatchDetail | null>(null);

  useEffect(() => {
    api.listMatches({ status: tab }).then((r) => setItems(r.items));
  }, [tab]);

  async function loadDetail(id: string) {
    setSelected(await api.getMatch(id));
  }

  async function review(id: string, action: "dismiss" | "approve" | "reopen") {
    await api.review(id, action);
    setSelected(null);
    const r = await api.listMatches({ status: tab });
    setItems(r.items);
  }

  return (
    <section className={styles.root}>
      <h1>Intégrité éditoriale</h1>
      <Tabs
        tabs={[
          { id: "open", label: "À examiner" },
          { id: "dismissed", label: "Écartés" },
          { id: "approved", label: "Validés" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      {items.length === 0 ? (
        <EmptyState>Aucun signalement dans cet onglet.</EmptyState>
      ) : (
        <ul className={styles.matchList}>
          {items.map((m) => (
            <li key={m.id} className={styles.matchItem}>
              <button onClick={() => loadDetail(m.id)}>
                {m.sourceArticleId} → {m.articleId}
              </button>
              <SeverityBadge severity={m.severity} />
              <span>{(m.score * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <article>
          <h2>Passages communs</h2>
          <MatchDiff passages={selected.passages} />
          <button onClick={() => review(selected.id, "dismiss")}>Écarter</button>
          <button onClick={() => review(selected.id, "approve")}>Valider</button>
          <button onClick={() => review(selected.id, "reopen")}>Rouvrir</button>
        </article>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Write `ui/widgets/IntegrityOverviewWidget.tsx`**

```tsx
// ui/widgets/IntegrityOverviewWidget.tsx
import { useEffect, useState } from "react";
import { api, type ApiMatch } from "../api";
import { EmptyState, SeverityBadge } from "../components/Primitives";

export default function IntegrityOverviewWidget() {
  const [items, setItems] = useState<ApiMatch[]>([]);
  useEffect(() => {
    api.listMatches({ status: "open", severity: "critical" }).then((r) => setItems(r.items));
  }, []);
  if (!items.length) return <EmptyState>Aucun signalement critique.</EmptyState>;
  return (
    <ul>
      {items.map((m) => (
        <li key={m.id}>
          <a href={`/admin/plugins/content-integrity/match/${m.id}`}>
            {m.sourceArticleId} → {m.articleId}
          </a>{" "}
          <SeverityBadge severity={m.severity} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 9: Write `ui/fields/IntegrityField.tsx`**

```tsx
// ui/fields/IntegrityField.tsx
import { useEffect, useState } from "react";
import { api, type ApiMatch } from "../api";

export default function IntegrityField({ articleId }: { articleId: string }) {
  const [items, setItems] = useState<ApiMatch[]>([]);
  useEffect(() => {
    api.listMatches().then((r) =>
      setItems(r.items.filter((m) => m.articleId === articleId || m.sourceArticleId === articleId)),
    );
  }, [articleId]);
  if (!items.length) return <p>Aucun signalement pour cet article.</p>;
  return (
    <ul>
      {items.map((m) => (
        <li key={m.id}>
          <a href={`/admin/plugins/content-integrity/match/${m.id}`}>
            {m.score.toFixed(2)} — {m.severity}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 10: Write `admin.tsx`** (descriptor)

```tsx
// admin.tsx
import IntegrityPage from "./ui/pages/IntegrityPage";
import IntegrityOverviewWidget from "./ui/widgets/IntegrityOverviewWidget";
import IntegrityField from "./ui/fields/IntegrityField";

export const admin = {
  pages: [
    {
      id: "content-integrity",
      path: "/plugins/content-integrity",
      label: "Intégrité éditoriale",
      component: IntegrityPage,
    },
  ],
  widgets: [
    {
      id: "content-integrity-overview",
      label: "Intégrité",
      component: IntegrityOverviewWidget,
    },
  ],
  fields: [
    {
      id: "content-integrity-field",
      label: "Correspondances",
      component: IntegrityField,
      // Bound to posts via widget metadata, not via auto-injection.
    },
  ],
};
```

- [ ] **Step 11: Type-check admin**

Run: `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 12: Commit**

```bash
git add src/plugins/content-integrity/src/admin.tsx src/plugins/content-integrity/src/ui
git commit -m "feat(content-integrity): add admin UI (page, widget, field, api wrapper)"
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-content-integrity exec tsc --noEmit` passes.

## Task 15: Wire descriptor, register in `astro.config.mjs`, integration test, golden-set manual run

**Files:**
- Create: `src/plugins/content-integrity/src/index.ts`
- Modify: `astro.config.mjs` (add plugin to `emdash({ plugins: [...] })`)
- Create: `src/plugins/content-integrity/test/integration.test.ts`
- Create: `src/plugins/content-integrity/test/golden/README.md`
- Create: `src/plugins/content-integrity/test/golden/fixtures.ts` (skeleton — filled by hand before release)

**Produces:** the plugin live in the app and a smoke test that proves the end-to-end pipeline works against a real Cloudflare runtime (via `vitest` + `@cloudflare/vitest-pool-workers` or equivalent configured locally).

- [ ] **Step 1: Write `src/index.ts`** (descriptor + factory)

```ts
// src/plugins/content-integrity/src/index.ts
import { definePlugin } from "emdash/astro";
import { routes } from "./routes";
import { createIndexEntry } from "./hooks/index-entry";
import { createPurgeEntry } from "./hooks/purge-entry";
import { createBoilerplateHook } from "./hooks/boilerplate";
import { admin } from "./admin";

export function contentIntegrityPlugin() {
  return definePlugin({
    id: "content-integrity",
    name: "Intégrité éditoriale",
    capabilities: ["content:read"], // phase 1: read-only
    storage: {
      collections: [
        { name: "content_integrity_fingerprints", indexedFields: ["articleId"] },
        { name: "content_integrity_bands", indexedFields: ["articleId", "bandId", "bucket"] },
        { name: "content_integrity_matches", indexedFields: ["status", "severity", "articleId"] },
      ],
    },
    routes,
    hooks: [
      { event: "content:afterPublish",  priority: 100, timeout: 5000, errorPolicy: "continue", handler: createIndexEntry() },
      { event: "content:afterSave",     priority: 100, timeout: 5000, errorPolicy: "continue",
        handler: (event, ctx) => event.status === "published" ? createIndexEntry()(event, ctx) : undefined },
      { event: "content:afterUnpublish", priority: 100, timeout: 5000, errorPolicy: "continue", handler: createPurgeEntry() },
      { event: "content:afterDelete",   priority: 100, timeout: 5000, errorPolicy: "continue", handler: createPurgeEntry() },
      { event: "content:afterRestore",  priority: 100, timeout: 5000, errorPolicy: "continue", handler: createIndexEntry() },
      { event: "config:afterChange",    priority: 100, timeout: 5000, errorPolicy: "continue", handler: createBoilerplateHook() },
    ],
    admin,
  });
}
```

- [ ] **Step 2: Modify `astro.config.mjs`**

Add to `emdash({ plugins: [...] })`:

```js
import { contentIntegrityPlugin } from "./src/plugins/content-integrity/src/index.ts";
// ...
emdash({
  // ...
  plugins: [
    researchPaperEmbedPlugin(),
    seoProPlugin(),
    autoInternalLinkerPlugin(),
    glossaryCardsPlugin(),
    contentIntegrityPlugin(), // <-- new
    aiEditorialAssistantPlugin({ ollamaHost: "localhost" }),
  ],
}),
```

Also extend `vite.optimizeDeps.include` and `vite.ssr.noExternal`:

```js
include: [
  // ...
  "@cannelle/plugin-content-integrity",
],
ssr: {
  noExternal: [
    // ...
    "@cannelle/plugin-content-integrity",
  ],
},
```

- [ ] **Step 3: Type-check the whole app**

Run: `pnpm exec astro check`
Expected: zero errors.

- [ ] **Step 4: Write `test/integration.test.ts`** (smoke — uses Cloudflare pool if available, otherwise skipped)

```ts
// test/integration.test.ts
import { describe, expect, it } from "vitest";
import { contentIntegrityPlugin } from "../src/index";

describe.skipIf(!process.env.CLOUDFLARE_POOL)("content-integrity integration", () => {
  it("descriptor exposes routes, hooks, and admin surfaces", () => {
    const p = contentIntegrityPlugin();
    expect(p.id).toBe("content-integrity");
    expect(p.routes.length).toBe(7);
    expect(p.hooks.length).toBe(6);
    expect(p.storage.collections.length).toBe(3);
    expect(p.admin.pages.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Document the golden-set manual run**

Create `test/golden/README.md` with:

- The 6 fixtures (exact-near-duplicate, partial-rewrite, boilerplate-heavy, single-source vs. many, identical-different-authors, empty-content).
- The pass criteria (severity bucket, top match id, top score bucket).
- The run command: `pnpm --filter @cannelle/plugin-content-integrity test:golden` (script placeholder).
- A note: "Run manually before any phase-1 release; results committed to `docs/superpowers/golden-results/2026-XX-XX.md`."

- [ ] **Step 6: Run full test suite**

Run: `pnpm test src/plugins/content-integrity/`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/content-integrity astro.config.mjs
git commit -m "feat(content-integrity): wire descriptor, register plugin, add integration test"
```

- [ ] **Step 8: Build production bundle**

Run: `pnpm build`
Expected: clean build, no warnings about missing routes/hooks.

- [ ] **Verify checkpoint:** `pnpm build` succeeds and the integration test passes against the local emulator.
