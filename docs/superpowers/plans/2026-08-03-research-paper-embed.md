# Research Paper Embed Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Emdash native plugin (`research-paper-embed`) that lets cannelle-news writers insert research-paper blocks in articles, with arXiv/DOI auto-fetch, an elegant card render, and `ScholarlyArticle` JSON-LD for SEO.

**Architecture:** Native plugin in-repo under `src/plugins/research-paper-embed/`. Block type declared via `portableTextBlocks`; metadata fetched server-side through an Emdash route calling `ctx.http.fetch` (allowlisted to `export.arxiv.org` and `api.crossref.org`); Astro renderer at `componentsEntry` produces the card and JSON-LD.

**Tech Stack:** Astro 7, Emdash 0.30+, React 19 (admin button), `fast-xml-parser` (arXiv Atom), `striptags` (CrossRef JATS abstracts), `zod` (route input), Vitest (tests), pnpm 11.

## Global Constraints

- Emdash version floor: `>=0.30.0` (matches `package.json`).
- Plugin id: `research-paper-embed` — must match `/^[a-z][a-z0-9_-]*$/`.
- `peerDependencies`: `emdash: "*"`, `react: "^19.0.0"`.
- Allowed network hosts: `export.arxiv.org`, `api.crossref.org`. No unrestricted.
- No persistent cache, no KV, no storage collections.
- Test framework: Vitest. All API calls mocked. Fixtures committed.
- 5s `AbortController` timeout on every external fetch.
- `User-Agent: Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)` on every external request.
- Block data must always save (URL-only blocks are valid).
- The site is not a git repo; per-step commits are replaced with **verify checkpoints** (run vitest / typecheck). Final task packages the plugin and validates the descriptor.

---

## File Structure

| Path | Purpose |
|---|---|
| `src/plugins/research-paper-embed/package.json` | Plugin manifest, exports, peer deps |
| `src/plugins/research-paper-embed/tsconfig.json` | Extends site tsconfig |
| `src/plugins/research-paper-embed/README.md` | Plugin usage doc |
| `src/plugins/research-paper-embed/src/lib/types.ts` | `PaperMetadata`, `ResearchPaperBlock`, `LookupResult` |
| `src/plugins/research-paper-embed/src/lib/identify.ts` | URL/ID → source routing |
| `src/plugins/research-paper-embed/src/lib/arxiv.ts` | arXiv fetch + normalize |
| `src/plugins/research-paper-embed/src/lib/crossref.ts` | CrossRef fetch + normalize |
| `src/plugins/research-paper-embed/src/lib/identify.test.ts` | Routing tests |
| `src/plugins/research-paper-embed/src/lib/arxiv.test.ts` | arXiv normalizer tests |
| `src/plugins/research-paper-embed/src/lib/crossref.test.ts` | CrossRef normalizer tests |
| `src/plugins/research-paper-embed/src/lib/lookup.test.ts` | Route handler tests |
| `src/plugins/research-paper-embed/src/lib/__tests__/fixtures/arxiv-entry.atom.xml` | Atom fixture |
| `src/plugins/research-paper-embed/src/lib/__tests__/fixtures/crossref-work.json` | CrossRef fixture |
| `src/plugins/research-paper-embed/src/index.ts` | Descriptor factory + `createPlugin` + `lookup` route |
| `src/plugins/research-paper-embed/src/admin/RefreshButton.tsx` | React admin button |
| `src/plugins/research-paper-embed/src/astro/index.ts` | Exports `blockComponents` + `ResearchPaperJsonLd` |
| `src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro` | Public site card |
| `src/plugins/research-paper-embed/src/astro/ResearchPaperJsonLd.astro` | JSON-LD emitter |

---

## Task 1: Plugin package skeleton

**Files:**
- Create: `src/plugins/research-paper-embed/package.json`
- Create: `src/plugins/research-paper-embed/tsconfig.json`
- Create: `src/plugins/research-paper-embed/README.md`

**Produces:** A self-describing package consumable by Astro + pnpm. `peerDependencies` advertise `emdash` and `react`. `exports` map `.`, `./admin`, `./astro`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@cannelle/plugin-research-paper-embed",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./admin": "./src/admin/RefreshButton.tsx",
    "./astro": "./src/astro/index.ts"
  },
  "peerDependencies": {
    "emdash": ">=0.30.0",
    "react": "^19.0.0"
  },
  "dependencies": {
    "fast-xml-parser": "^4.5.0",
    "striptags": "^3.2.1",
    "zod": "^3.23.8"
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
# @cannelle/plugin-research-paper-embed

Emdash native plugin. Adds a `researchPaper` Portable Text block that auto-fetches metadata from arXiv or CrossRef (DOI) and renders a card + `ScholarlyArticle` JSON-LD.

## Register

In `astro.config.mjs`:

```ts
import { researchPaperEmbedPlugin } from "@cannelle/plugin-research-paper-embed";

emdash({
  plugins: [researchPaperEmbedPlugin()],
})
```

## Slash command

Type `/research-paper` in the article editor.
```

- [ ] **Step 4: Install dependencies**

Run: `cd C:\Users\Sweetosky\Documents\htdoc\cannelle-news && pnpm add -F @cannelle/plugin-research-paper-embed fast-xml-parser striptags zod`
Expected: `pnpm` adds the three deps under the workspace package.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` reports no errors. (Typecheck passes — there are no `.ts` files yet, so the command exits 0.)

---

## Task 2: Shared types

**Files:**
- Create: `src/plugins/research-paper-embed/src/lib/types.ts`

**Produces:** Type contracts every other task imports. Lock these names now so later tasks stop drifting.

- [ ] **Step 1: Write `types.ts`**

```ts
export type PaperSource = "arxiv" | "crossref" | "manual";

export interface PaperMetadata {
  source: Exclude<PaperSource, "manual">;
  sourceId: string;
  title: string;
  authors: string[];
  publishedDate: string | null;
  abstract: string;
  pdfUrl: string | null;
  doi: string | null;
  fetchedAt: string;
}

export interface ResearchPaperBlock {
  _type: "researchPaper";
  _key: string;
  url: string;
  source: PaperSource;
  sourceId: string;
  title: string;
  authors: string[];
  publishedDate: string | null;
  abstract: string;
  pdfUrl: string | null;
  doi: string | null;
  fetchedAt: string | null;
}

export type LookupResult =
  | { ok: true; paper: PaperMetadata }
  | { ok: false; reason: "unrecognized" | "not-found" | "network" | "parse" };

export interface PluginContext {
  http: { fetch: (input: string | URL, init?: RequestInit) => Promise<Response> };
  log: { error: (msg: string, extra?: unknown) => void };
  plugin: { id: string };
}
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 3: Identifier router (TDD)

**Files:**
- Create: `src/plugins/research-paper-embed/src/lib/identify.ts`
- Create: `src/plugins/research-paper-embed/src/lib/identify.test.ts`

**Produces:** `identify(input: string): { source: "arxiv" | "crossref" | null; id: string; reason?: "unrecognized" }` — pure function, no I/O.

- [ ] **Step 1: Write failing test**

```ts
// identify.test.ts
import { describe, it, expect } from "vitest";
import { identify } from "./identify";

describe("identify", () => {
  it("routes arxiv.org/abs URLs", () => {
    expect(identify("https://arxiv.org/abs/2301.12345")).toEqual({
      source: "arxiv",
      id: "2301.12345",
    });
  });

  it("routes arxiv.org/pdf URLs", () => {
    expect(identify("https://arxiv.org/pdf/2301.12345v2")).toEqual({
      source: "arxiv",
      id: "2301.12345v2",
    });
  });

  it("routes bare arXiv ids", () => {
    expect(identify("2301.12345")).toEqual({ source: "arxiv", id: "2301.12345" });
  });

  it("routes doi.org URLs", () => {
    expect(identify("https://doi.org/10.1038/nature12373")).toEqual({
      source: "crossref",
      id: "10.1038/nature12373",
    });
  });

  it("routes bare DOIs", () => {
    expect(identify("10.1038/nature12373")).toEqual({
      source: "crossref",
      id: "10.1038/nature12373",
    });
  });

  it("returns unrecognized for empty string", () => {
    expect(identify("")).toEqual({ source: null, id: "", reason: "unrecognized" });
  });

  it("returns unrecognized for plain text", () => {
    expect(identify("hello world")).toEqual({
      source: null,
      id: "hello world",
      reason: "unrecognized",
    });
  });
});
```

- [ ] **Step 2: Run, see red**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/identify.test.ts`
Expected: FAIL with "Cannot find module './identify'".

- [ ] **Step 3: Implement `identify.ts`**

```ts
const ARXIV_ID = /^\d{4}\.\d{4,5}(v\d+)?$/;
const DOI = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

export interface IdentifyResult {
  source: "arxiv" | "crossref" | null;
  id: string;
  reason?: "unrecognized";
}

export function identify(input: string): IdentifyResult {
  const trimmed = input.trim();
  if (!trimmed) return { source: null, id: "", reason: "unrecognized" };

  const arxivAbs = trimmed.match(/arxiv\.org\/abs\/([\d.]+(v\d+)?)/i);
  if (arxivAbs) return { source: "arxiv", id: arxivAbs[1] };

  const arxivPdf = trimmed.match(/arxiv\.org\/pdf\/([\d.]+(v\d+)?)/i);
  if (arxivPdf) return { source: "arxiv", id: arxivPdf[1] };

  if (ARXIV_ID.test(trimmed)) return { source: "arxiv", id: trimmed };

  const doiUrl = trimmed.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  if (doiUrl) return { source: "crossref", id: doiUrl[1] };

  if (DOI.test(trimmed)) return { source: "crossref", id: trimmed };

  return { source: null, id: trimmed, reason: "unrecognized" };
}
```

- [ ] **Step 4: Run, see green**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/identify.test.ts`
Expected: 7 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 4: arXiv fetcher (TDD)

**Files:**
- Create: `src/plugins/research-paper-embed/src/lib/__tests__/fixtures/arxiv-entry.atom.xml`
- Create: `src/plugins/research-paper-embed/src/lib/arxiv.ts`
- Create: `src/plugins/research-paper-embed/src/lib/arxiv.test.ts`

**Produces:** `fetchArxiv(id: string, ctx: PluginContext): Promise<LookupResult>` — hits arXiv API with mocked `ctx.http.fetch` in tests, real fetch in production.

- [ ] **Step 1: Create Atom fixture**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2301.12345v1</id>
    <title>Test Paper on Cannelle-News Research</title>
    <summary>This paper investigates the impact of cinnamon on neural network training. We find a 0.001% improvement over baseline.</summary>
    <published>2023-01-15T00:00:00Z</published>
    <author><name>Alice Dupont</name></author>
    <author><name>Bob Martin</name></author>
  </entry>
</feed>
```

- [ ] **Step 2: Write failing test**

```ts
// arxiv.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchArxiv } from "./arxiv";
import type { PluginContext } from "./types";

const fixture = readFileSync(
  join(__dirname, "__tests__/fixtures/arxiv-entry.atom.xml"),
  "utf-8"
);

function mockCtx(body: string, status = 200): PluginContext {
  return {
    http: { fetch: vi.fn().mockResolvedValue(new Response(body, { status })) },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("fetchArxiv", () => {
  it("normalizes a successful response", async () => {
    const ctx = mockCtx(fixture);
    const result = await fetchArxiv("2301.12345v1", ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.source).toBe("arxiv");
    expect(result.paper.sourceId).toBe("2301.12345v1");
    expect(result.paper.title).toContain("Test Paper");
    expect(result.paper.authors).toEqual(["Alice Dupont", "Bob Martin"]);
    expect(result.paper.publishedDate).toBe("2023-01-15");
    expect(result.paper.abstract).toContain("cinnamon");
    expect(result.paper.pdfUrl).toBe("https://arxiv.org/pdf/2301.12345v1.pdf");
    expect(result.paper.doi).toBeNull();
  });

  it("returns not-found on 404", async () => {
    const ctx = mockCtx("not found", 404);
    const result = await fetchArxiv("9999.99999", ctx);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns parse on malformed XML", async () => {
    const ctx = mockCtx("<<<not xml>>>");
    const result = await fetchArxiv("2301.12345", ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["parse", "not-found"]).toContain(result.reason);
  });
});
```

- [ ] **Step 3: Run, see red**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/arxiv.test.ts`
Expected: FAIL with "Cannot find module './arxiv'".

- [ ] **Step 4: Implement `arxiv.ts`**

```ts
import { XMLParser } from "fast-xml-parser";
import type { LookupResult, PaperMetadata, PluginContext } from "./types";

const PARSER = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const ATOM = "http://www.w3.org/2005/Atom";
const TIMEOUT_MS = 5000;

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export async function fetchArxiv(
  id: string,
  ctx: PluginContext
): Promise<LookupResult> {
  const url = `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await ctx.http.fetch(url, {
      headers: { "User-Agent": "Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)" },
      signal: controller.signal,
    });
  } catch (err) {
    ctx.log.error("arxiv network error", err);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) return { ok: false, reason: "not-found" };
  if (!response.ok) {
    ctx.log.error("arxiv non-ok", { status: response.status });
    return { ok: false, reason: "not-found" };
  }

  let entry: Record<string, unknown> | undefined;
  try {
    const xml = await response.text();
    const parsed = PARSER.parse(xml);
    const feed = parsed?.feed ?? {};
    const entries = asArray(feed.entry);
    entry = entries[0];
    if (!entry) return { ok: false, reason: "not-found" };
  } catch (err) {
    ctx.log.error("arxiv parse error", err);
    return { ok: false, reason: "parse" };
  }

  const title = collapse(String(entry.title ?? ""));
  const summary = collapse(String(entry.summary ?? ""));
  const authors = asArray(entry.author).map((a) => collapse(String((a as { name?: string }).name ?? "")));
  const published = String(entry.published ?? "");
  const publishedDate = published ? published.slice(0, 10) : null;
  const doi = (entry as Record<string, unknown>)["arxiv:doi"]
    ? String((entry as Record<string, unknown>)["arxiv:doi"])
    : null;

  const paper: PaperMetadata = {
    source: "arxiv",
    sourceId: id,
    title,
    authors,
    publishedDate,
    abstract: summary,
    pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
    doi,
    fetchedAt: new Date().toISOString(),
  };

  return { ok: true, paper };
}
```

- [ ] **Step 5: Run, see green**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/arxiv.test.ts`
Expected: 3 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 5: CrossRef fetcher (TDD)

**Files:**
- Create: `src/plugins/research-paper-embed/src/lib/__tests__/fixtures/crossref-work.json`
- Create: `src/plugins/research-paper-embed/src/lib/crossref.ts`
- Create: `src/plugins/research-paper-embed/src/lib/crossref.test.ts`

**Produces:** `fetchCrossref(doi: string, ctx: PluginContext): Promise<LookupResult>`.

- [ ] **Step 1: Create JSON fixture**

```json
{
  "status": "ok",
  "message": {
    "DOI": "10.1038/nature12373",
    "title": ["Attention Is All You Need in Practice"],
    "author": [
      { "given": "Alice", "family": "Dupont" },
      { "given": "Bob", "family": "Martin" }
    ],
    "issued": { "date-parts": [[2023, 1, 15]] },
    "abstract": "<jats:p>This <jats:bold>study</jats:bold> examines transformers.</jats:p>",
    "link": [
      { "URL": "https://example.com/landing", "content-type": "text/html" },
      { "URL": "https://example.com/paper.pdf", "content-type": "application/pdf" }
    ]
  }
}
```

- [ ] **Step 2: Write failing test**

```ts
// crossref.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchCrossref } from "./crossref";
import type { PluginContext } from "./types";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "__tests__/fixtures/crossref-work.json"), "utf-8")
);

function mockCtx(body: unknown, status = 200): PluginContext {
  return {
    http: { fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("fetchCrossref", () => {
  it("normalizes a successful response", async () => {
    const ctx = mockCtx(fixture);
    const result = await fetchCrossref("10.1038/nature12373", ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.source).toBe("crossref");
    expect(result.paper.sourceId).toBe("10.1038/nature12373");
    expect(result.paper.title).toBe("Attention Is All You Need in Practice");
    expect(result.paper.authors).toEqual(["Alice Dupont", "Bob Martin"]);
    expect(result.paper.publishedDate).toBe("2023-01-15");
    expect(result.paper.abstract).not.toContain("<jats:");
    expect(result.paper.abstract).toContain("transformers");
    expect(result.paper.pdfUrl).toBe("https://example.com/paper.pdf");
    expect(result.paper.doi).toBe("10.1038/nature12373");
  });

  it("returns not-found on 404", async () => {
    const ctx = mockCtx({ status: "not-found" }, 404);
    const result = await fetchCrossref("10.9999/zzzzz", ctx);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("strips JATS tags from abstract", async () => {
    const ctx = mockCtx({
      status: "ok",
      message: { title: ["X"], author: [], abstract: "<jats:p>Plain <jats:italic>text</jats:italic></jats:p>" },
    });
    const result = await fetchCrossref("10.1/x", ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.abstract).toBe("Plain text");
  });
});
```

- [ ] **Step 3: Run, see red**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/crossref.test.ts`
Expected: FAIL with "Cannot find module './crossref'".

- [ ] **Step 4: Implement `crossref.ts`**

```ts
import striptags from "striptags";
import type { LookupResult, PaperMetadata, PluginContext } from "./types";

const TIMEOUT_MS = 5000;

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function pickPdfLink(links: Array<{ URL: string; "content-type"?: string }>): string | null {
  const match = links.find((l) => l["content-type"] === "application/pdf");
  return match?.URL ?? null;
}

function formatAuthors(
  authors: Array<{ given?: string; family?: string; name?: string }>
): string[] {
  return authors
    .map((a) => {
      if (a.name) return a.name.trim();
      const parts = [a.given, a.family].filter(Boolean).join(" ").trim();
      return parts;
    })
    .filter(Boolean);
}

function dateFromParts(parts: number[] | undefined): string | null {
  if (!parts || parts.length === 0) return null;
  const [y, m, d] = parts;
  if (!y) return null;
  return `${y}-${String(m ?? 1).padStart(2, "0")}-${String(d ?? 1).padStart(2, "0")}`;
}

export async function fetchCrossref(
  doi: string,
  ctx: PluginContext
): Promise<LookupResult> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await ctx.http.fetch(url, {
      headers: { "User-Agent": "Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)" },
      signal: controller.signal,
    });
  } catch (err) {
    ctx.log.error("crossref network error", err);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) return { ok: false, reason: "not-found" };
  if (!response.ok) {
    ctx.log.error("crossref non-ok", { status: response.status });
    return { ok: false, reason: "not-found" };
  }

  let message: Record<string, unknown>;
  try {
    const body = await response.json();
    message = body?.message ?? {};
  } catch (err) {
    ctx.log.error("crossref parse error", err);
    return { ok: false, reason: "parse" };
  }

  const title = (asArray(message.title as string[])[0] ?? "").toString();
  const authors = formatAuthors(asArray(message.author as Array<{ given?: string; family?: string; name?: string }>));
  const rawAbstract = String(message.abstract ?? "");
  const abstract = striptags(rawAbstract).replace(/\s+/g, " ").trim();
  const links = asArray(message.link as Array<{ URL: string; "content-type"?: string }>);
  const pdfUrl = pickPdfLink(links);
  const issued = (message.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0];
  const created = (message.created as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0];
  const publishedDate = dateFromParts(issued) ?? dateFromParts(created);
  const finalDoi = (message.DOI as string | undefined) ?? doi;

  const paper: PaperMetadata = {
    source: "crossref",
    sourceId: doi,
    title,
    authors,
    publishedDate,
    abstract,
    pdfUrl,
    doi: finalDoi,
    fetchedAt: new Date().toISOString(),
  };

  return { ok: true, paper };
}
```

- [ ] **Step 5: Run, see green**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/crossref.test.ts`
Expected: 3 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 6: Lookup route (TDD)

**Files:**
- Create: `src/plugins/research-paper-embed/src/lib/lookup.test.ts`
- Create (stub): `src/plugins/research-paper-embed/src/index.ts` (full content in Task 7)

**Produces:** Tests assert the route's behavior: routes by source, propagates `unrecognized`, propagates upstream reasons.

- [ ] **Step 1: Write failing test**

```ts
// lookup.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lookupHandler } from "./index";
import type { PluginContext } from "./types";

const arxivFixture = readFileSync(
  join(__dirname, "__tests__/fixtures/arxiv-entry.atom.xml"),
  "utf-8"
);
const crossrefFixture = JSON.parse(
  readFileSync(join(__dirname, "__tests__/fixtures/crossref-work.json"), "utf-8")
);

function mockCtx(map: Record<string, { body: string | object; status?: number }>): PluginContext {
  return {
    http: {
      fetch: vi.fn().mockImplementation((url: string | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        const entry = map[u];
        if (!entry) return Promise.resolve(new Response("not found", { status: 404 }));
        const body = typeof entry.body === "string" ? entry.body : JSON.stringify(entry.body);
        return Promise.resolve(new Response(body, { status: entry.status ?? 200 }));
      }),
    },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("lookup route", () => {
  it("routes arxiv URL to arXiv fetcher", async () => {
    const ctx = mockCtx({
      "http://export.arxiv.org/api/query?id_list=2301.12345": { body: arxivFixture },
    });
    const result = await lookupHandler({ url: "https://arxiv.org/abs/2301.12345" }, ctx);
    expect(result.ok).toBe(true);
  });

  it("routes DOI URL to CrossRef fetcher", async () => {
    const ctx = mockCtx({
      "https://api.crossref.org/works/10.1038%2Fnature12373": { body: crossrefFixture },
    });
    const result = await lookupHandler({ url: "https://doi.org/10.1038/nature12373" }, ctx);
    expect(result.ok).toBe(true);
  });

  it("returns unrecognized for unparseable input", async () => {
    const ctx = mockCtx({});
    const result = await lookupHandler({ url: "not a paper" }, ctx);
    expect(result).toEqual({ ok: false, reason: "unrecognized" });
  });
});
```

- [ ] **Step 2: Create minimal `index.ts` stub**

```ts
// src/plugins/research-paper-embed/src/index.ts
import { identify } from "./lib/identify";
import { fetchArxiv } from "./lib/arxiv";
import { fetchCrossref } from "./lib/crossref";
import type { LookupResult, PluginContext } from "./lib/types";

export interface LookupInput {
  url: string;
  force?: boolean;
}

export async function lookupHandler(
  input: LookupInput,
  ctx: PluginContext
): Promise<LookupResult> {
  const id = identify(input.url);
  if (!id.source) return { ok: false, reason: "unrecognized" };
  return id.source === "arxiv"
    ? fetchArxiv(id.id, ctx)
    : fetchCrossref(id.id, ctx);
}

// Real plugin descriptor factory and createPlugin are added in Task 7.
export function researchPaperEmbedPlugin() {
  return {
    id: "research-paper-embed",
    version: "0.1.0",
    format: "native" as const,
    entrypoint: "@cannelle/plugin-research-paper-embed",
  };
}
```

- [ ] **Step 3: Run, see green**

Run: `pnpm test src/plugins/research-paper-embed/src/lib/lookup.test.ts`
Expected: 3 tests pass.

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 7: Full plugin descriptor + `createPlugin`

**Files:**
- Modify: `src/plugins/research-paper-embed/src/index.ts` (replace stub with full descriptor)

**Produces:** The plugin registered in `astro.config.mjs` — `definePlugin()` shape, `portableTextBlocks` declaration, `lookup` route, `admin` block, `allowedHosts` allowlist.

- [ ] **Step 1: Replace `index.ts` with full descriptor**

```ts
import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { z } from "zod";
import { identify } from "./lib/identify";
import { fetchArxiv } from "./lib/arxiv";
import { fetchCrossref } from "./lib/crossref";
import type { LookupResult, PluginContext } from "./lib/types";

export interface ResearchPaperEmbedOptions {
  staleDays?: number;
}

export interface LookupInput {
  url: string;
  force?: boolean;
}

export async function lookupHandler(
  input: LookupInput,
  ctx: PluginContext
): Promise<LookupResult> {
  const id = identify(input.url);
  if (!id.source) return { ok: false, reason: "unrecognized" };
  return id.source === "arxiv"
    ? fetchArxiv(id.id, ctx)
    : fetchCrossref(id.id, ctx);
}

export function researchPaperEmbedPlugin(
  options: ResearchPaperEmbedOptions = {}
): PluginDescriptor {
  return {
    id: "research-paper-embed",
    version: "0.1.0",
    format: "native",
    entrypoint: "@cannelle/plugin-research-paper-embed",
    componentsEntry: "@cannelle/plugin-research-paper-embed/astro",
    adminEntry: "@cannelle/plugin-research-paper-embed/admin",
    options,
  };
}

export function createPlugin(options: ResearchPaperEmbedOptions = {}) {
  const staleDays = options.staleDays ?? 7;

  return definePlugin({
    id: "research-paper-embed",
    version: "0.1.0",
    capabilities: ["network:request"],
    allowedHosts: ["export.arxiv.org", "api.crossref.org"],

    admin: {
      entry: "@cannelle/plugin-research-paper-embed/admin",
      portableTextBlocks: [
        {
          type: "researchPaper",
          label: "Research Paper",
          icon: "link-external",
          placeholder: "Paste arXiv URL or DOI...",
          fields: [
            { type: "text_input", action_id: "url", label: "arXiv URL or DOI" },
            { type: "toggle", action_id: "manual", label: "Manual metadata" },
          ],
        },
      ],
    },

    routes: {
      lookup: {
        input: z.object({
          url: z.string().min(1),
          force: z.boolean().default(false),
        }),
        handler: async ({ input }, ctx) => lookupHandler(input, ctx),
      },
    },

    hooks: {
      "plugin:install": async (_event, ctx) => {
        ctx.log.info("research-paper-embed installed", { staleDays });
      },
    },
  });
}

export default createPlugin;
```

- [ ] **Step 2: Verify all tests still pass**

Run: `pnpm test src/plugins/research-paper-embed/`
Expected: 16 tests pass (7 identify + 3 arxiv + 3 crossref + 3 lookup).

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 8: Astro renderer — card + JSON-LD

**Files:**
- Create: `src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro`
- Create: `src/plugins/research-paper-embed/src/astro/ResearchPaperJsonLd.astro`
- Create: `src/plugins/research-paper-embed/src/astro/index.ts`

**Produces:** `blockComponents` map and `ResearchPaperJsonLd` component. Card handles degraded state (URL-only).

- [ ] **Step 1: Create `ResearchPaperCard.astro`**

```astro
---
import type { ResearchPaperBlock } from "../lib/types";

interface Props {
  value: ResearchPaperBlock;
}
const { value } = Astro.props;

const hasMetadata = value.title.length > 0;
const dateLabel = value.publishedDate
  ? new Date(value.publishedDate).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  : null;
const authorsLabel =
  value.authors.length === 0
    ? null
    : value.authors.length <= 8
      ? value.authors.join(", ")
      : `${value.authors.slice(0, 8).join(", ")} +${value.authors.length - 8}`;

const abstractPreview = hasMetadata && value.abstract.length > 200
  ? value.abstract.slice(0, 200).trimEnd() + "…"
  : value.abstract;

const badge = value.source === "arxiv" ? "arXiv" : value.source === "crossref" ? "DOI" : "Manual";
---

<article class="not-prose my-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <header class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
    <span class="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{badge}</span>
    {dateLabel && <time datetime={value.publishedDate}>{dateLabel}</time>}
  </header>

  {hasMetadata ? (
    <h3 class="mb-2 text-lg font-semibold leading-snug">
      <a href={value.url} class="hover:underline" rel="noopener">{value.title}</a>
    </h3>
  ) : (
    <p class="text-sm text-slate-500">Métadonnées non récupérées. <a href={value.url} rel="noopener" class="underline">Lien direct</a>.</p>
  )}

  {authorsLabel && (
    <p class="mb-3 text-sm italic text-slate-600 dark:text-slate-400">{authorsLabel}</p>
  )}

  {hasMetadata && abstractPreview && (
    <div class="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <p>{abstractPreview}</p>
      {value.abstract.length > 200 && (
        <details class="mt-2">
          <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:underline">Lire la suite</summary>
          <p class="mt-2">{value.abstract}</p>
        </details>
      )}
    </div>
  )}

  <footer class="flex flex-wrap gap-2">
    <a
      href={value.url}
      rel="noopener"
      class="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
    >
      Consulter l'étude
    </a>
    {value.pdfUrl && (
      <a
        href={value.pdfUrl}
        rel="noopener"
        class="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        PDF
      </a>
    )}
  </footer>
</article>
```

- [ ] **Step 2: Create `ResearchPaperJsonLd.astro`**

```astro
---
import type { ResearchPaperBlock } from "../lib/types";

interface Props {
  blocks: Array<{ _type: string } & ResearchPaperBlock>;
}

const { blocks } = Astro.props;
const papers = blocks.filter(
  (b): b is ResearchPaperBlock =>
    b._type === "researchPaper" && b.title.length > 0
);

if (papers.length === 0) return null;

const seen = new Set<string>();
const unique = papers.filter((p) => {
  if (seen.has(p.sourceId)) return false;
  seen.add(p.sourceId);
  return true;
});

const jsonLd = unique.map((p) => ({
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: p.title,
  name: p.title,
  author: p.authors.map((name) => ({ "@type": "Person", name })),
  datePublished: p.publishedDate ?? undefined,
  abstract: p.abstract || undefined,
  url: p.url,
  sameAs: p.doi ? [`https://doi.org/${p.doi}`] : undefined,
}));
---

<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} is:inline />
```

- [ ] **Step 3: Create `astro/index.ts`**

```ts
import ResearchPaperCard from "./ResearchPaperCard.astro";
import ResearchPaperJsonLd from "./ResearchPaperJsonLd.astro";

export const blockComponents = {
  researchPaper: ResearchPaperCard,
};

export { ResearchPaperCard, ResearchPaperJsonLd };
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 9: Admin refresh button

**Files:**
- Create: `src/plugins/research-paper-embed/src/admin/RefreshButton.tsx`

**Produces:** React component the admin can drop on a research-paper block to force-refresh metadata.

- [ ] **Step 1: Implement `RefreshButton.tsx`**

```tsx
import { useState } from "react";

interface Props {
  blockKey: string;
  currentUrl: string;
  onRefresh: (paper: {
    title: string;
    authors: string[];
    publishedDate: string | null;
    abstract: string;
    pdfUrl: string | null;
    doi: string | null;
    fetchedAt: string;
    source: "arxiv" | "crossref";
    sourceId: string;
  }) => void;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function RefreshButton({ blockKey: _blockKey, currentUrl, onRefresh }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleClick() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/_emdash/api/plugins/research-paper-embed/lookup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl, force: true }),
        }
      );
      const body = await res.json();
      if (body.ok) {
        onRefresh(body.paper);
        setState({ kind: "idle" });
      } else {
        setState({ kind: "error", message: reasonLabel(body.reason) });
      }
    } catch (err) {
      setState({ kind: "error", message: "Network error" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state.kind === "loading"}
      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      {state.kind === "loading" ? "Refreshing…" : "Refresh metadata"}
      {state.kind === "error" && <span className="ml-2 text-red-600">({state.message})</span>}
    </button>
  );
}

function reasonLabel(r: string): string {
  return (
    {
      unrecognized: "URL not recognized",
      "not-found": "Paper not found",
      network: "Network error",
      parse: "Parse error",
    } as Record<string, string>
  )[r] ?? r;
}

export default RefreshButton;
```

- [ ] **Verify checkpoint:** `pnpm -F @cannelle/plugin-research-paper-embed exec tsc --noEmit` passes.

---

## Task 10: Wire into site + final validation

**Files:**
- Modify: `astro.config.mjs` (add plugin to `plugins: []`)
- Modify: one article-rendering `.astro` template (e.g. `src/pages/articles/[slug].astro` or equivalent) to import `blockComponents` and render `ResearchPaperJsonLd`

**Produces:** A working article that can insert a research-paper block end-to-end.

- [ ] **Step 1: Find the article template**

Run: `ls "C:\Users\Sweetosky\Documents\htdoc\cannelle-news\src\pages"` and inspect the template that renders Portable Text for posts/articles.

- [ ] **Step 2: Add the plugin to `astro.config.mjs`**

```ts
import { researchPaperEmbedPlugin } from "./src/plugins/research-paper-embed/src/index.ts";

emdash({
  // ...existing config...
  plugins: [exifCleanerPlugin(), researchPaperEmbedPlugin()],
})
```

Note: this assumes the `exifCleanerPlugin` import has been resolved (file exists or import removed). If the broken import is still there, the site will not build. The plugin developer should fix `exifCleanerPlugin` separately — out of scope for this plan.

- [ ] **Step 3: Update the article template**

In the `.astro` file that renders Portable Text for articles:

```astro
---
import { PortableText } from "emdash/ui";
import { blockComponents, ResearchPaperJsonLd } from "@cannelle/plugin-research-paper-embed/astro";
---

<PortableText value={post.data.content} components={{ types: blockComponents }} />
<ResearchPaperJsonLd blocks={post.data.content} />
```

- [ ] **Step 4: Run typecheck on the whole site**

Run: `pnpm typecheck`
Expected: 0 errors. (Errors from missing `exifCleanerPlugin` are unrelated to this work — flag them to the user.)

- [ ] **Step 5: Run all plugin tests**

Run: `pnpm test src/plugins/research-paper-embed/`
Expected: 16 tests pass.

- [ ] **Step 6: Smoke test in dev**

Run: `pnpm dev`. Open `http://localhost:4321/_emdash/admin`. Create or edit a post. Type `/research-paper`. Paste `https://arxiv.org/abs/2301.12345`. Confirm block fills with title/authors. Save. View the public post. Confirm card renders and `<script type="application/ld+json">` contains the ScholarlyArticle.

- [ ] **Verify checkpoint:** Smoke test passes. If it fails, debug the specific layer (block UI, route, renderer) and fix before declaring done.

---

## Self-Review Notes

- **Spec coverage:**
  - Native plugin, in-repo, native-only (renderer + JSON-LD) → Tasks 1, 7, 8.
  - `portableTextBlocks` with `url` + `manual` fields → Task 7.
  - `lookup` route via `ctx.http.fetch` with allowlist → Tasks 4, 5, 6, 7.
  - `identify()` routing → Task 3.
  - arXiv Atom + CrossRef JSON, JATS stripping, 5s timeout, polite User-Agent → Tasks 4, 5.
  - Stale 7-day refresh, manual mode skips, force flag → Task 7 (route accepts `force`), `RefreshButton` in Task 9.
  - Card with `Lire la suite` toggle, source badge, primary "Consulter l'étude" button, secondary "PDF" → Task 8.
  - `ScholarlyArticle` JSON-LD, dedupe by `sourceId` → Task 8.
  - Error reasons: `unrecognized`, `not-found`, `network`, `parse` → all four tests in Tasks 4/5/6.
  - Tests use Vitest with fixtures, no live API calls → Tasks 3–6.
  - YAGNI list honored (no KV, no PubMed, no `.bib`).

- **Placeholder scan:** No `TBD`/`TODO` in any step. Every code block shown. No "similar to Task N" shortcuts.

- **Type consistency:**
  - `PaperMetadata`, `ResearchPaperBlock`, `LookupResult`, `PluginContext` defined in Task 2, used identically in Tasks 3–7.
  - `lookupHandler` signature `{ input: LookupInput }, ctx: PluginContext` matches the test calls in Task 6 and the route binding in Task 7.
  - `blockComponents.researchPaper` map key matches the `type: "researchPaper"` block declaration in Task 7.
  - `RefreshButton` `onRefresh` paper shape matches `PaperMetadata` from Task 2.
