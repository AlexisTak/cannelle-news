# Research Paper Embed Plugin — Design Spec

**Date:** 2026-08-03
**Project:** cannelle-news
**Plugin id:** `research-paper-embed`
**Format:** Emdash native plugin
**Scope:** v1 — arXiv + CrossRef (DOI), single-site deployment

## Purpose

Cannelle-news covers AI research, healthcare AI, and digital security. Writers frequently cite arXiv preprints and DOI-indexed papers. Today they paste bare links; readers get a wall of text with no metadata. This plugin adds a **research paper block** to the editor: paste an arXiv URL or DOI, plugin auto-fills title/authors/abstract/date, public site renders an elegant card with a "Consulter l'étude" CTA and emits `ScholarlyArticle` JSON-LD for SEO.

## Architecture

Native Emdash plugin, in-repo (matches the existing `exifCleanerPlugin` pattern under `src/plugins/`). Distribution to other Emdash sites is out of scope for v1.

```
src/plugins/research-paper-embed/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                       # descriptor factory + createPlugin
    ├── admin/
    │   └── RefreshButton.tsx          # React component for admin toolbar
    ├── lib/
    │   ├── types.ts                   # PaperMetadata, ResearchPaperBlock
    │   ├── identify.ts                # URL/ID → "arxiv" | "crossref"
    │   ├── arxiv.ts                   # arXiv API fetch + normalize
    │   ├── crossref.ts                # CrossRef API fetch + normalize
    │   └── __tests__/
    │       ├── identify.test.ts
    │       ├── arxiv.test.ts
    │       ├── crossref.test.ts
    │       ├── lookup.test.ts
    │       └── fixtures/
    │           ├── arxiv-entry.atom.xml
    │           └── crossref-work.json
    └── astro/
        ├── index.ts                   # exports blockComponents
        ├── ResearchPaperCard.astro
        └── ResearchPaperJsonLd.astro
```

### Why native, not sandboxed

Native is required because the plugin ships:
1. A **Portable Text block type** with Block Kit fields (sandboxed OK here).
2. An **Astro rendering component** via `componentsEntry` (native only).
3. **Inline HTML** for JSON-LD (native only, via `page:fragments` or direct Astro component rendering).

Sandboxed plugins can declare block types but cannot ship Astro renderers. Native is the only valid path.

## Trust contract

```ts
{
  id: "research-paper-embed",
  format: "native",
  entrypoint: "@cannelle/plugin-research-paper-embed",
  componentsEntry: "@cannelle/plugin-research-paper-embed/astro",
  adminEntry: "@cannelle/plugin-research-paper-embed/admin",
  capabilities: ["network:request"],
  allowedHosts: ["export.arxiv.org", "api.crossref.org"],
  version: "0.1.0"
}
```

Explicit host allowlist over `network:request:unrestricted` because destination hosts are part of the plugin's design, not user-configured.

## Data model

`ResearchPaperBlock` shape stored in Portable Text:

```ts
interface ResearchPaperBlock {
  _type: "researchPaper";
  _key: string;
  url: string;                       // canonical URL the user pasted
  source: "arxiv" | "crossref" | "manual";
  sourceId: string;                  // arXiv id (e.g. "2301.12345") or DOI
  title: string;
  authors: string[];
  publishedDate: string | null;      // ISO 8601 date
  abstract: string;
  pdfUrl: string | null;
  doi: string | null;
  fetchedAt: string | null;          // ISO timestamp; null when manual
}
```

Required fields populated even on partial failure (`title: ""`, `authors: []`, etc.) so the block stays valid Portable Text. Renderer shows degraded state gracefully.

## Editor integration

### Block declaration

```ts
admin: {
  portableTextBlocks: [{
    type: "researchPaper",
    label: "Research Paper",
    icon: "link-external",
    placeholder: "Paste arXiv URL or DOI...",
    fields: [
      { type: "text_input", action_id: "url", label: "arXiv URL or DOI" },
      { type: "toggle", action_id: "manual", label: "Manual metadata" }
    ]
  }]
}
```

### Insert flow

1. Editor types `/research-paper` (slash command).
2. Block created with `url` only, all metadata fields empty.
3. Client-side effect calls `/_emdash/api/plugins/research-paper-embed/lookup` with `{ url }`.
4. Response fills `title`, `authors`, etc. Block updates in the editor.
5. If lookup returns `ok: false`, block stays URL-only. Admin shows a red banner: "Metadata unavailable. Click Refresh to retry."

### Stale-data refresh

On every editor load of an article containing a `researchPaper` block, the client checks each block's `fetchedAt`:
- `null` (manual) → no auto-refresh.
- `> 7 days` old → call lookup with `force: true`, merge response silently.
- `< 7 days` → leave alone.

The "Refresh" button in the admin toolbar always forces a re-fetch regardless of age.

## Fetch logic

### `identify.ts`

Routing rules:
- `arxiv.org/abs/<id>` or `arxiv.org/pdf/<id>` → `arxiv`
- bare arXiv id matching `^\d{4}\.\d{4,5}(v\d+)?$` → `arxiv`
- `doi.org/...` or bare DOI matching `^10\.\d{4,9}/[-._;()/:A-Z0-9]+$` → `crossref`
- else → `{ source: null, reason: "unrecognized" }`

### `arxiv.ts`

```
GET http://export.arxiv.org/api/query?id_list=<id>
Headers:
  User-Agent: Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)
```

Response: Atom XML. Parse with `fast-xml-parser`. Map:
- `feed.entry.title` → `title` (strip `\n`, collapse whitespace)
- `feed.entry.author[*].name` → `authors[]`
- `feed.entry.published` → `publishedDate` (ISO date prefix only)
- `feed.entry.summary` → `abstract` (strip whitespace, trim)
- `pdfUrl` = `https://arxiv.org/pdf/<id>.pdf` (constructed)
- `doi` = `feed.entry["arxiv:doi"]` if present

5s timeout via `AbortController`. Returns `{ ok: true, paper }` or `{ ok: false, reason }`.

### `crossref.ts`

```
GET https://api.crossref.org/works/<doi>
Headers:
  User-Agent: Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)
```

Response: JSON envelope `{ message: {...} }`. Map:
- `message.title[0]` → `title`
- `message.author[*]` → `${given} ${family}`.join where present
- `message.issued["date-parts"][0]` or `message.created["date-parts"][0]` → `publishedDate`
- `message.abstract` (often JATS XML) → strip tags via `striptags` → `abstract`
- `message.link[?content-type=='application/pdf'].URL` → `pdfUrl`
- `message.DOI` → `doi`

5s timeout. Same return shape as arXiv.

### Lookup route

```ts
routes: {
  lookup: {
    input: z.object({
      url: z.string().min(1),
      force: z.boolean().default(false)
    }),
    handler: async ({ input }, ctx) => {
      const id = identify(input.url);
      if (!id.source) return { ok: false, reason: id.reason };
      const fetcher = id.source === "arxiv" ? fetchArxiv : fetchCrossref;
      return await fetcher(id.id, ctx);
    }
  }
}
```

Mounted at `/_emdash/api/plugins/research-paper-embed/lookup`.

## Rendering

### `ResearchPaperCard.astro`

Props: `value: ResearchPaperBlock`.

Layout (Tailwind utility classes match site conventions):
- Top row: source badge (`arXiv` / `DOI` / `Manual`) + formatted date.
- Title as `<h3>`, link wraps title to `url`.
- Authors line, italic, comma-separated, truncated with `+N` if > 8.
- Abstract inside `<details>`/`<summary>` for SSR-safe expand (no JS):
  - `<summary>` shows "Lire la suite" (French site).
  - First 200 chars always visible above the `<details>`.
- Footer buttons: "Consulter l'étude" (primary, → `url`) and "PDF" (secondary, only if `pdfUrl`).

Empty-state (URL-only block, no metadata): renders the URL as a plain link with a small note "Metadata not yet fetched."

### `ResearchPaperJsonLd.astro`

Props: `value: ResearchPaperBlock`.

Emits a `<script type="application/ld+json" set:html={...}>` block:

```json
{
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  "headline": "<title>",
  "name": "<title>",
  "author": [{"@type": "Person", "name": "<author>"}, ...],
  "datePublished": "<publishedDate>",
  "abstract": "<abstract>",
  "url": "<url>",
  "sameAs": ["https://doi.org/<doi>"]
}
```

Dedupe: when a page has multiple `researchPaper` blocks, render a single `<script>` containing a JSON array. Use a `Set` keyed on `sourceId` to avoid duplicates.

### Wiring in site

Article templates (any `.astro` rendering Portable Text) gain one extra import:

```astro
import { blockComponents } from "@cannelle/plugin-research-paper-embed/astro";
import { ResearchPaperJsonLd } from "@cannelle/plugin-research-paper-embed/astro";

<PortableText value={post.data.content} components={{ types: blockComponents }} />
<ResearchPaperJsonLd blocks={post.data.content} />
```

## Error handling

| Failure mode | Behavior |
|---|---|
| arXiv 404 | `reason: "not-found"`, block stays URL-only, red banner in admin |
| CrossRef 404 | same as above |
| Network timeout (5s) | `reason: "network"`, banner: "Metadata unavailable. Click Refresh." |
| XML/JSON parse error | `ctx.log.error` + `reason: "parse"`, banner same as network |
| User pastes garbage | `reason: "unrecognized"`, banner: "Could not identify as arXiv or DOI" |
| Editor publishes article anyway | Article publishes; block renders degraded state with the URL visible |

Block never blocks article publication. Always saves.

## Testing

Vitest (already in the project). All tests under `src/lib/__tests__/`. `ctx.http.fetch` mocked — no live API calls in CI.

- `identify.test.ts` — every URL/ID pattern from the routing rules.
- `arxiv.test.ts` — fixture Atom XML → asserted normalized `PaperMetadata`.
- `crossref.test.ts` — fixture JSON envelope → asserted normalized `PaperMetadata`.
- `lookup.test.ts` — full route handler with mocked `ctx.http.fetch`, asserts both happy path and `not-found`/`network`/`parse` reasons.

Fixtures committed in `__tests__/fixtures/`.

## Out of scope (v1)

- Persistent caching / KV storage. Each block stores its own metadata snapshot.
- PubMed, OpenAlex, Semantic Scholar, HAL.
- Citation export (`.bib`, `.ris`).
- Inline `[1]` footnote-style citations.
- Multi-language abstracts.
- Distribution as a separate npm package to other Emdash sites.

## Open questions

None for v1. v2 candidates: persistent cache via `ctx.kv`, multiple scholarly source backends, `.bib` export.
