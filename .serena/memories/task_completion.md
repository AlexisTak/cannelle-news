# Task Completion

Run, in order:

1. `pnpm typecheck` (`astro check`) — must pass clean.
2. If `seed/seed.json` changed: `npx emdash types` (or restart `npx emdash dev`, which does it) and confirm `emdash-env.d.ts` reflects the new fields. Never hand-edit that file.
3. Exercise affected routes against `npx emdash dev` (`http://localhost:4321`, admin at `/_emdash/admin`).

No test runner, linter, or formatter is configured. Do not add or invent one unless asked.

Do not commit `.env` (`EMDASH_ENCRYPTION_KEY`). Project is not under git — there is no pre-commit safety net.
