# @cannelle/plugin-content-integrity

Emdash native plugin. Detects internal near-duplicates among published posts
on Cannelle News using MinHash + LSH. Phase 1 is **consultative only** —
findings appear in the `/integrity` admin page and as a field widget, never
blocking publication.

## Capabilities

- Reads posts content (`content:read`).
- Detects candidates through an indexed LSH lookup, then compares them exactly.
- Persists findings in `ctx.storage.matches` (status / severity / passages).
- Rebuilds the fingerprint and LSH indexes in cursor-based batches.

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
| `review`  | authenticated admin | Change finding status in plugin storage |
| `rebuild` | `plugins:manage`   | Cursor-based reindex             |
| `settings`| `plugins:manage`   | Read / write `IntegrityConfig`   |
