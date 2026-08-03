# cannelle-news — Core

EmDash CMS site on Astro + Cloudflare Workers. Single module, no monorepo packages.

## Source map

| Path | Role |
|---|---|
| `astro.config.mjs` | `output: "server"`, cloudflare adapter, `emdash()` with d1/r2 |
| `wrangler.jsonc` | bindings `DB` (D1), `MEDIA` (R2), `LOADER` (worker_loader, plugin sandbox); cron `* * * * *` drives scheduled publishing + plugin cron |
| `src/worker.ts` | re-exports `default` + `PluginBridge` from `@emdash-cms/cloudflare/worker` |
| `src/live.config.ts` | `emdashLoader()` registration — boilerplate, DO NOT modify |
| `src/layouts/Base.astro` | only layout; menus, LiveSearch, `EmDashHead`/`BodyStart`/`BodyEnd`, page context |
| `src/pages/` | `index`, `404`, `[slug]`, `posts/index`, `posts/[slug]`, `category/[slug]`, `tag/[slug]` |
| `src/utils/site-identity.ts` | `resolveStarterSiteIdentity`, `DEFAULT_SITE_TITLE`, `DEFAULT_SITE_TAGLINE` |
| `seed/seed.json` | schema source of truth: collections `posts`/`pages`, taxonomies `category`/`tag`, `primary` menu, settings `title`/`tagline` |
| `emdash-env.d.ts`, `worker-configuration.d.ts` | generated — never hand-edit |

## Invariants

- All content pages server-rendered. Never `getStaticPaths()` for CMS content.
- Image fields are objects `{ src, alt }`, not strings. Render with `<Image image={...} />` from `emdash/ui`.
- `entry.id` = slug (URLs). `entry.data.id` = database ULID (API calls e.g. `getEntryTerms`).
- Always `Astro.cache.set(cacheHint)` on pages that query content (guard with `Astro.cache?.enabled`).
- Taxonomy names in queries must match seed `"name"` exactly: `"category"` / `"tag"` (singular).
- Schema changes go through `seed/seed.json`, then regenerate types — not through ad-hoc migrations.

## Authoritative API references

Do not rely on training recall for EmDash APIs; both sources are current:
- MCP server `emdash-docs` (`https://docs.emdashcms.com/mcp`, tool `search_docs`), wired via `.mcp.json`.
- Local skills in `.agents/skills/`: `building-emdash-site` (querying, Portable Text, schema, site features), `creating-plugins` (hooks, storage, admin UI, block types), `emdash-cli` (content/media/type commands, auth, editing flow).

## Further memories

- Runtime, deps, package-manager policy: `mem:tech_stack`
- Dev/build/deploy commands + Windows shell differences: `mem:suggested_commands`
- Code style + per-page composition patterns: `mem:conventions`
- What to run before calling a task done: `mem:task_completion`
