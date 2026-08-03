# Commands

## Project

| Command | Notes |
|---|---|
| `npx emdash dev` | preferred dev server — also runs migrations, seeds, regenerates types |
| `pnpm dev` | plain `astro dev`, skips migrate/seed/typegen |
| `npx emdash types` | regenerate `emdash-env.d.ts` from schema |
| `pnpm typecheck` | `astro check` — the only checker configured |
| `pnpm build` / `pnpm preview` | |
| `pnpm deploy` | `astro build && wrangler deploy` |

Admin UI: `http://localhost:4321/_emdash/admin`.

Gotcha: `README.md` documents `pnpm bootstrap`, but no `bootstrap` script exists in `package.json`. Use `pnpm install` then `npx emdash dev`.

EmDash CLI splits local commands (`init`, `dev`, `seed`, `export-seed`, `auth secret` — act on the DB file directly) from remote commands (`types`, `login`, `content`, `schema`, `media`, `search`, `taxonomy`, `menu` — HTTP to a running instance). Localhost needs no token (dev bypass); remote needs `emdash login --url ...`, `--token`, or `EMDASH_TOKEN`. Details in `.agents/skills/emdash-cli/SKILL.md`.

## System (Windows)

- Not a git repository. No git history to consult.
- Default shell is PowerShell 5.1: `&&` / `||` are parser errors — use `;` plus `if ($?) { ... }`. No ternary, no `??`.
- `Select-String` not `grep`; `Get-Content -TotalCount N` / `-Tail N` not `head`/`tail`; `(Get-Command x).Source` not `which`.
- A Bash tool (Git Bash) is also available and accepts normal POSIX syntax — pick one per invocation, don't mix.
