# Tech Stack

- Astro `^7` (`output: "server"`), React `19.2.4` pinned exact via `@astrojs/react` `^6`.
- `emdash` + `@emdash-cms/cloudflare` `^0.30.0` — CMS runtime, admin UI, loader, worker entry.
- Runtime: Cloudflare Workers (`@astrojs/cloudflare` ^14, wrangler ^4.99). `nodejs_compat` flag on, compatibility_date `2026-02-24`.
- Storage: D1 database binding `DB` (`session: "auto"`), R2 bucket binding `MEDIA`, worker_loader binding `LOADER` for plugin sandboxing.
- TS config extends `astro/tsconfigs/base`, `types: ["node"]`, includes `src`, `.astro/types.d.ts`, `emdash-env.d.ts`.

## Package manager policy (`pnpm-workspace.yaml`) — non-obvious

pnpm `11.9.0` (pinned via `packageManager`). The workspace file enforces supply-chain rules that will reject naive installs:

- `minimumReleaseAge: 1440` — a dependency version published <24h ago is refused. Exempt: `emdash`, `@emdash-cms/*`.
- `blockExoticSubdeps: true` — no git/tarball/non-registry transitive sources.
- `allowBuilds` whitelist: `esbuild: true`, `workerd: true`, `better-sqlite3: false`, `sharp: false`. Any new dep with a postinstall build needs an explicit entry or `strictDepBuilds` fails.
- Deliberately no `trustPolicy: no-downgrade` (trips on upstream provenance regressions).

## Secrets

`.env` holds `EMDASH_ENCRYPTION_KEY`. Never print, commit, or copy into other files.
