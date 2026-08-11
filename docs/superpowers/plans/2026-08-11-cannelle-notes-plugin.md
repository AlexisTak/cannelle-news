# Cannelle Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sandboxed EmDash plugin ("Cannelle Notes") that gives the admin panel a shared team notes board — title/body notes with status (`todo`/`done`), pin, and assignment to a real EmDash user account.

**Architecture:** One sandboxed plugin (`src/plugins/notes/`) following the exact structure of the existing sandboxed plugins (`fact-check`, `paywall`, `media`): a `domain.ts` with the `Note` type and pure list-ordering logic, an `index.ts` plugin descriptor, and a single `sandbox-entry.ts` with routes + a Block Kit admin dashboard. Registered in `astro.config.mjs` and surfaced as a new "Équipe" category in the admin-hub catalog.

**Tech Stack:** TypeScript (strict), Zod for route input validation, `@emdash-cms/blocks` (Block Kit) for the admin UI, Vitest for tests.

## Global Constraints

- Plugin id must be prefixed `cannelle-` / label prefixed "Cannelle" — repo-wide naming convention (`plan_plugin.md` §Convention de nommage).
- Every plugin route must declare an explicit `permission` (read vs manage) — never rely on the implicit default.
- No reader/session identity is available inside sandboxed route handlers (`SandboxedRouteContext` = `{ input, request, requestMeta }` only — confirmed against EmDash 0.30 docs and this repo's other sandboxed plugins). Author/assignee are chosen from `ctx.users` (capability `users:read`), never free text.
- Sandboxed plugins in this repo test `domain.ts` (pure logic) and `index.ts` (descriptor shape) with Vitest; `sandbox-entry.ts` (routes + Block Kit wiring) is not unit-tested anywhere in this codebase (no mock sandbox-runtime harness exists for sandboxed — as opposed to native — plugins) and is verified instead via `astro check`, `astro build`, and a manual dashboard smoke test. This plan follows that convention rather than inventing an untested pattern.
- The design spec's file tree listed `README.md`, `CHANGELOG.md`, and `sandbox-entry.test.ts`, but its own §3 says to match `fact-check`/`paywall` — and neither of those two plugins (nor `media`) actually has a README, CHANGELOG, or a sandbox-entry test. This plan follows what those plugins actually do, not the spec's tree, on the theory that "match the sibling plugins" is the real intent and the file list was just optimistic. `forms`/`analytics`/`newsletter` do carry README+CHANGELOG, but those are the richer trio with external integrations worth documenting — Notes is closer in size and shape to fact-check/paywall.
- No new runtime dependency beyond what every other sandboxed plugin already declares: `@emdash-cms/blocks@0.30.0`, `zod@^4.4.1`, peer `emdash@>=0.30.0`.

---

### Task 1: Plugin package scaffold + domain logic

**Files:**
- Create: `src/plugins/notes/package.json`
- Create: `src/plugins/notes/tsconfig.json`
- Create: `src/plugins/notes/src/domain.ts`
- Test: `src/plugins/notes/src/domain.test.ts`

**Interfaces:**
- Produces: `Note` type — `{ id: string; title: string; body: string; authorId: string; authorName: string; assigneeId: string | null; assigneeName: string | null; status: "todo" | "done"; pinned: boolean; createdAt: string; updatedAt: string }`
- Produces: `sortNotes(notes: Note[]): Note[]` — pinned notes first, then `updatedAt` descending.
- Produces: `filterByStatus(notes: Note[], status: "todo" | "done"): Note[]`

- [ ] **Step 1: Create the package manifest**

```json
{
	"name": "@cannelle/plugin-notes",
	"version": "0.1.0",
	"type": "module",
	"private": true,
	"exports": {
		".": "./src/index.ts",
		"./sandbox": "./src/sandbox-entry.ts"
	},
	"dependencies": {
		"@emdash-cms/blocks": "0.30.0",
		"zod": "^4.4.1"
	},
	"peerDependencies": {
		"emdash": ">=0.30.0"
	}
}
```

Write this to `src/plugins/notes/package.json`.

- [ ] **Step 2: Create the TypeScript config**

```json
{ "extends": "../../../tsconfig.json", "compilerOptions": { "composite": false, "noEmit": true, "strict": true, "types": [] }, "include": ["src/**/*"] }
```

Write this to `src/plugins/notes/tsconfig.json`.

- [ ] **Step 3: Write the failing test for `sortNotes` and `filterByStatus`**

Create `src/plugins/notes/src/domain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterByStatus, sortNotes, type Note } from "./domain";

function makeNote(overrides: Partial<Note>): Note {
	return {
		id: "n1",
		title: "Titre",
		body: "Corps",
		authorId: "u1",
		authorName: "Alex",
		assigneeId: null,
		assigneeName: null,
		status: "todo",
		pinned: false,
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-01T00:00:00.000Z",
		...overrides,
	};
}

describe("sortNotes", () => {
	it("place les notes épinglées avant les autres, quelle que soit leur date", () => {
		const recentUnpinned = makeNote({ id: "recent", pinned: false, updatedAt: "2026-08-10T00:00:00.000Z" });
		const oldPinned = makeNote({ id: "old-pinned", pinned: true, updatedAt: "2026-08-01T00:00:00.000Z" });
		expect(sortNotes([recentUnpinned, oldPinned]).map((n) => n.id)).toEqual(["old-pinned", "recent"]);
	});

	it("trie par updatedAt décroissant à égalité d'épinglage", () => {
		const older = makeNote({ id: "older", updatedAt: "2026-08-01T00:00:00.000Z" });
		const newer = makeNote({ id: "newer", updatedAt: "2026-08-05T00:00:00.000Z" });
		expect(sortNotes([older, newer]).map((n) => n.id)).toEqual(["newer", "older"]);
	});

	it("ne mute pas le tableau d'entrée", () => {
		const notes = [makeNote({ id: "a" }), makeNote({ id: "b" })];
		const copy = [...notes];
		sortNotes(notes);
		expect(notes).toEqual(copy);
	});
});

describe("filterByStatus", () => {
	it("ne garde que le statut demandé", () => {
		const todo = makeNote({ id: "todo1", status: "todo" });
		const done = makeNote({ id: "done1", status: "done" });
		expect(filterByStatus([todo, done], "done")).toEqual([done]);
	});

	it("retourne un tableau vide si aucune note ne correspond", () => {
		const todo = makeNote({ id: "todo1", status: "todo" });
		expect(filterByStatus([todo], "done")).toEqual([]);
	});
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/plugins/notes/src/domain.test.ts`
Expected: FAIL — `Cannot find module './domain'` (file doesn't exist yet).

- [ ] **Step 5: Implement `domain.ts`**

Create `src/plugins/notes/src/domain.ts`:

```ts
export interface Note {
	id: string;
	title: string;
	body: string;
	authorId: string;
	authorName: string;
	assigneeId: string | null;
	assigneeName: string | null;
	status: "todo" | "done";
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
}

export function sortNotes(notes: Note[]): Note[] {
	return [...notes].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
		return b.updatedAt.localeCompare(a.updatedAt);
	});
}

export function filterByStatus(notes: Note[], status: "todo" | "done"): Note[] {
	return notes.filter((note) => note.status === status);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/plugins/notes/src/domain.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/notes/package.json src/plugins/notes/tsconfig.json src/plugins/notes/src/domain.ts src/plugins/notes/src/domain.test.ts
git commit -m "feat: scaffold Cannelle Notes plugin with domain logic"
```

---

### Task 2: Plugin descriptor (`index.ts`)

**Files:**
- Create: `src/plugins/notes/src/index.ts`
- Test: `src/plugins/notes/src/index.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (descriptor is standalone), but must stay consistent with the `notes` storage collection Task 3 will read/write.
- Produces: `CANNELLE_NOTES_ID = "cannelle-notes"`, `cannelleNotesPlugin(): PluginDescriptor` — `entrypoint: "@cannelle/plugin-notes/sandbox"`, `capabilities: ["users:read"]`, `storage: { notes: { indexes: [...] } }`, `adminPages: [{ path: "/notes", label: "Cannelle Notes", icon: "clipboard-list" }]`. Task 4 (astro.config.mjs) and Task 5 (admin-hub catalog) both depend on this exact `id` (`"cannelle-notes"`) and `adminPages[0].path` (`"/notes"`).

- [ ] **Step 1: Write the failing test**

Create `src/plugins/notes/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CANNELLE_NOTES_ID, cannelleNotesPlugin } from "./index";

describe("cannelleNotesPlugin", () => {
	it("déclare l'id, le format et l'entrypoint attendus", () => {
		const plugin = cannelleNotesPlugin();
		expect(plugin.id).toBe(CANNELLE_NOTES_ID);
		expect(plugin.id).toBe("cannelle-notes");
		expect(plugin.format).toBe("standard");
		expect(plugin.entrypoint).toBe("@cannelle/plugin-notes/sandbox");
	});

	it("ne déclare que la capacité users:read", () => {
		expect(cannelleNotesPlugin().capabilities).toEqual(["users:read"]);
	});

	it("déclare la collection de stockage notes", () => {
		expect(Object.keys(cannelleNotesPlugin().storage ?? {})).toEqual(["notes"]);
	});

	it("déclare une seule page admin à /notes", () => {
		expect(cannelleNotesPlugin().adminPages).toEqual([{ path: "/notes", label: "Cannelle Notes", icon: "clipboard-list" }]);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/plugins/notes/src/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implement `index.ts`**

Create `src/plugins/notes/src/index.ts`:

```ts
import type { PluginDescriptor } from "emdash";

export const CANNELLE_NOTES_ID = "cannelle-notes";

export function cannelleNotesPlugin(): PluginDescriptor {
	return {
		id: CANNELLE_NOTES_ID,
		version: "0.1.0",
		format: "standard",
		entrypoint: "@cannelle/plugin-notes/sandbox",
		options: {},
		capabilities: ["users:read"],
		storage: {
			notes: { indexes: ["status", "pinned", "assigneeId", "updatedAt"] },
		},
		adminPages: [{ path: "/notes", label: "Cannelle Notes", icon: "clipboard-list" }],
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/plugins/notes/src/index.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/notes/src/index.ts src/plugins/notes/src/index.test.ts
git commit -m "feat: add Cannelle Notes plugin descriptor"
```

---

### Task 3: Routes + Block Kit admin dashboard (`sandbox-entry.ts`)

**Files:**
- Create: `src/plugins/notes/src/sandbox-entry.ts`

**Interfaces:**
- Consumes: `Note`, `sortNotes` from `./domain` (Task 1); `PluginDescriptor`-declared `notes` storage collection and `users:read` capability (Task 2) — this file is what actually uses both.
- Produces: default export `satisfies SandboxedPlugin` with routes `notes` (GET list, `permission: "plugins:read"`), `create`, `update`, `delete` (all `permission: "plugins:manage"` — the default when unset, so left implicit exactly like `paywall`'s `plansRoute`/`couponRoute`), and `admin` (Block Kit dashboard). No test file for this task — see Global Constraints for why; instead this task ends with a manual dashboard smoke test (Step 8).

This file is not unit-tested (see Global Constraints), so there is no red/green cycle here — write it directly, then verify with typecheck and a manual smoke test.

- [ ] **Step 1: Write the storage helper and validation schemas**

Create `src/plugins/notes/src/sandbox-entry.ts`, starting with:

```ts
import type { PluginContext, SandboxedPlugin, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import { blocks, elements, type BlockInteraction, type BlockResponse } from "@emdash-cms/blocks/server";
import { sortNotes, type Note } from "./domain";

interface Collection<T> {
	get(id: string): Promise<T | null>;
	put(id: string, data: T): Promise<void>;
	delete(id: string): Promise<boolean>;
	query(options?: Record<string, unknown>): Promise<{ items: Array<{ id: string; data: T }>; hasMore: boolean }>;
}

const store = (ctx: PluginContext) => ({ notes: ctx.storage.notes as Collection<Note> });

const createSchema = z.object({
	title: z.string().trim().min(1).max(150),
	body: z.string().trim().min(1).max(5000),
	authorId: z.string().min(1),
	assigneeId: z.string().min(1).optional(),
});

const updateSchema = z.object({
	id: z.string().min(1),
	status: z.enum(["todo", "done"]).optional(),
	pinned: z.boolean().optional(),
	assigneeId: z.string().nullable().optional(),
});
```

- [ ] **Step 2: Add the route handlers**

Append to `src/plugins/notes/src/sandbox-entry.ts`:

```ts
async function notesRoute(_routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const result = await store(ctx).notes.query({ limit: 200 });
	return { notes: sortNotes(result.items.map((x) => x.data)) };
}

async function createRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const parsed = createSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw new Response("Invalid note", { status: 400 });
	if (!ctx.users) throw new Response("Users unavailable", { status: 503 });
	const author = await ctx.users.get(parsed.data.authorId);
	if (!author) throw new Response("Unknown author", { status: 400 });
	let assigneeName: string | null = null;
	if (parsed.data.assigneeId) {
		const assignee = await ctx.users.get(parsed.data.assigneeId);
		if (!assignee) throw new Response("Unknown assignee", { status: 400 });
		assigneeName = assignee.name ?? assignee.email;
	}
	const now = new Date().toISOString();
	const note: Note = {
		id: crypto.randomUUID(),
		title: parsed.data.title,
		body: parsed.data.body,
		authorId: author.id,
		authorName: author.name ?? author.email,
		assigneeId: parsed.data.assigneeId ?? null,
		assigneeName,
		status: "todo",
		pinned: false,
		createdAt: now,
		updatedAt: now,
	};
	await store(ctx).notes.put(note.id, note);
	return { success: true, note };
}

async function updateRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const parsed = updateSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw new Response("Invalid update", { status: 400 });
	const s = store(ctx);
	const note = await s.notes.get(parsed.data.id);
	if (!note) throw new Response("Not found", { status: 404 });
	let assigneeId = note.assigneeId;
	let assigneeName = note.assigneeName;
	if (parsed.data.assigneeId !== undefined) {
		assigneeId = parsed.data.assigneeId;
		if (assigneeId) {
			if (!ctx.users) throw new Response("Users unavailable", { status: 503 });
			const assignee = await ctx.users.get(assigneeId);
			if (!assignee) throw new Response("Unknown assignee", { status: 400 });
			assigneeName = assignee.name ?? assignee.email;
		} else {
			assigneeName = null;
		}
	}
	const updated: Note = {
		...note,
		status: parsed.data.status ?? note.status,
		pinned: parsed.data.pinned ?? note.pinned,
		assigneeId,
		assigneeName,
		updatedAt: new Date().toISOString(),
	};
	await s.notes.put(updated.id, updated);
	return { success: true, note: updated };
}

async function deleteRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>;
	if (typeof input.id !== "string") throw new Response("Invalid id", { status: 400 });
	await store(ctx).notes.delete(input.id);
	return { success: true };
}
```

- [ ] **Step 3: Add the Block Kit dashboard renderer**

Append:

```ts
async function usersToOptions(ctx: PluginContext) {
	if (!ctx.users) return [];
	const result = await ctx.users.list({ limit: 100 });
	return result.items.map((u) => ({ label: u.name ?? u.email, value: u.id }));
}

function noteBlocks(note: Note) {
	const meta = note.assigneeName ? `Assigné à ${note.assigneeName} — par ${note.authorName}` : `Par ${note.authorName}`;
	return [
		blocks.section(`**${note.title}**\n${note.body}\n_${meta}_`),
		blocks.actions([
			elements.button(note.status === "todo" ? "mark_done" : "mark_todo", note.status === "todo" ? "Marquer fait" : "Marquer à faire", { value: note.id }),
			elements.button("toggle_pin", note.pinned ? "Désépingler" : "Épingler", { value: note.id }),
			elements.button("delete_note", "Supprimer", {
				value: note.id,
				style: "danger",
				confirm: { title: "Supprimer la note", text: "Cette action est définitive.", confirm: "Supprimer", deny: "Annuler", style: "danger" },
			}),
		]),
	];
}

async function dashboard(ctx: PluginContext): Promise<BlockResponse> {
	const result = await store(ctx).notes.query({ limit: 200 });
	const notes = sortNotes(result.items.map((x) => x.data));
	const todo = notes.filter((n) => n.status === "todo");
	const done = notes.filter((n) => n.status === "done");
	const userOptions = await usersToOptions(ctx);
	return {
		blocks: [
			blocks.header("Cannelle Notes"),
			blocks.section("Notes d'équipe : rappels, idées, tâches courtes assignées."),
			blocks.stats([
				{ label: "Total", value: notes.length },
				{ label: "À faire", value: todo.length },
				{ label: "Fait", value: done.length },
			]),
			blocks.form({
				blockId: "note",
				fields: [
					elements.textInput("title", "Titre"),
					elements.textInput("body", "Texte", { multiline: true }),
					elements.select("authorId", "Auteur", userOptions),
					elements.select("assigneeId", "Assigné à", [{ label: "— Personne —", value: "" }, ...userOptions]),
				],
				submit: { label: "Créer la note", actionId: "create_note" },
			}),
			blocks.header("À faire"),
			...(todo.length ? todo.flatMap(noteBlocks) : [blocks.context("Aucune note à faire.")]),
			blocks.header("Terminé"),
			...(done.length ? done.flatMap(noteBlocks) : [blocks.context("Aucune note terminée.")]),
		],
	};
}
```

- [ ] **Step 4: Wire the `admin` interaction handler and export the plugin**

Append:

```ts
export default {
	hooks: {},
	routes: {
		notes: { permission: "plugins:read", input: z.unknown(), handler: notesRoute },
		create: { input: z.unknown(), handler: createRoute },
		update: { input: z.unknown(), handler: updateRoute },
		delete: { input: z.unknown(), handler: deleteRoute },
		admin: {
			input: z.unknown(),
			handler: async (routeCtx, ctx) => {
				const i = routeCtx.input as BlockInteraction;
				if (i?.type === "form_submit" && i.action_id === "create_note") {
					const values = i.values as Record<string, unknown>;
					const payload = { ...values, assigneeId: values.assigneeId === "" ? undefined : values.assigneeId };
					await createRoute({ ...routeCtx, input: payload, request: { ...routeCtx.request, method: "POST" } }, ctx);
					return { ...(await dashboard(ctx)), toast: { message: "Note créée.", type: "success" } };
				}
				if (i?.type === "block_action" && (i.action_id === "mark_done" || i.action_id === "mark_todo")) {
					await updateRoute({ ...routeCtx, input: { id: i.value, status: i.action_id === "mark_done" ? "done" : "todo" }, request: { ...routeCtx.request, method: "POST" } }, ctx);
					return dashboard(ctx);
				}
				if (i?.type === "block_action" && i.action_id === "toggle_pin") {
					const note = await store(ctx).notes.get(i.value as string);
					if (note) await updateRoute({ ...routeCtx, input: { id: note.id, pinned: !note.pinned }, request: { ...routeCtx.request, method: "POST" } }, ctx);
					return dashboard(ctx);
				}
				if (i?.type === "block_action" && i.action_id === "delete_note") {
					await deleteRoute({ ...routeCtx, input: { id: i.value }, request: { ...routeCtx.request, method: "POST" } }, ctx);
					return { ...(await dashboard(ctx)), toast: { message: "Note supprimée.", type: "success" } };
				}
				return dashboard(ctx);
			},
		},
	},
} satisfies SandboxedPlugin;
```

- [ ] **Step 5: Commit**

```bash
git add src/plugins/notes/src/sandbox-entry.ts
git commit -m "feat: add Cannelle Notes routes and admin dashboard"
```

(The manual dashboard smoke test happens in Task 6, once the plugin is registered and there's a running site to click through.)

---

### Task 4: Register the plugin in `astro.config.mjs` and link the workspace package

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: `cannelleNotesPlugin` from `./src/plugins/notes/src/index.ts` (Task 2), package name `@cannelle/plugin-notes` (Task 1).

- [ ] **Step 1: Add the import**

In `astro.config.mjs`, add this line to the existing import block (alphabetical order among the `./src/plugins/*` imports), after the `cannelleNewsletterPlugin` import:

```js
import { cannelleNotesPlugin } from "./src/plugins/notes/src/index.ts";
```

- [ ] **Step 2: Register the plugin instance**

In the `plugins: [...]` array (inside `emdash({...})`), add `cannelleNotesPlugin(),` — place it next to the other simple sandboxed plugins, e.g. right after `cannellePaywallPlugin(),`:

```js
cannellePaywallPlugin(),
cannelleNotesPlugin(),
glossaryCardsPlugin(),
```

- [ ] **Step 3: Add the package to `optimizeDeps.include` and `ssr.noExternal`**

In `vite.optimizeDeps.include`, add `"@cannelle/plugin-notes",` next to the other `@cannelle/plugin-*` entries. Do the same in `vite.ssr.noExternal`.

- [ ] **Step 4: Install to link the new workspace package**

Run: `pnpm install`
Expected: completes without error; `node_modules/@cannelle/plugin-notes` now symlinks to `src/plugins/notes`.

- [ ] **Step 5: Typecheck**

Run: `npx astro check --minimumSeverity error`
Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs pnpm-lock.yaml
git commit -m "feat: register Cannelle Notes plugin in astro.config"
```

---

### Task 5: Admin-hub catalog entry ("Équipe" category)

**Files:**
- Modify: `src/plugins/admin-hub/src/catalog.ts`
- Modify: `src/plugins/admin-hub/src/catalog.test.ts`

**Interfaces:**
- Consumes: plugin id `"cannelle-notes"` and admin page path `"/notes"` (Task 2) — must match exactly, since `pluginPage(id, path)` builds the nav URL from them.

- [ ] **Step 1: Extend the `AdminCategory` id union and add the category**

In `src/plugins/admin-hub/src/catalog.ts`, change:

```ts
export interface AdminCategory {
	id: "editorial" | "audience" | "revenue" | "quality";
```

to:

```ts
export interface AdminCategory {
	id: "editorial" | "audience" | "revenue" | "quality" | "team";
```

Then add a new entry to the `ADMIN_CATEGORIES` array (after the `"quality"` category, as the last entry):

```ts
{
	id: "team",
	name: "Équipe",
	description: "Coordination et suivi interne.",
	tools: [
		{ id: "notes", name: "Notes", description: "Notes d'équipe, statut et assignation.", page: pluginPage("cannelle-notes", "/notes") },
	],
},
```

- [ ] **Step 2: Update the existing catalog test's category/tool-count assertions**

In `src/plugins/admin-hub/src/catalog.test.ts`, change:

```ts
expect(ADMIN_CATEGORIES.map((item) => item.id)).toEqual(["editorial", "audience", "revenue", "quality"]);
expect(ADMIN_CATEGORIES.flatMap((item) => item.tools)).toHaveLength(11);
```

to:

```ts
expect(ADMIN_CATEGORIES.map((item) => item.id)).toEqual(["editorial", "audience", "revenue", "quality", "team"]);
expect(ADMIN_CATEGORIES.flatMap((item) => item.tools)).toHaveLength(12);
```

Leave the rest of the file (the `settings` link test, the descriptor/runtime parity test) untouched — Notes has no settings page, so it's correctly absent from that test's `id` list.

- [ ] **Step 3: Run the admin-hub tests**

Run: `npx vitest run src/plugins/admin-hub/src/catalog.test.ts`
Expected: PASS — both tests green with the updated numbers.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/admin-hub/src/catalog.ts src/plugins/admin-hub/src/catalog.test.ts
git commit -m "feat: surface Cannelle Notes in the admin hub under Équipe"
```

---

### Task 6: Full verification and manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass, including the new `src/plugins/notes/src/domain.test.ts` and `src/plugins/notes/src/index.test.ts`, and the updated `src/plugins/admin-hub/src/catalog.test.ts`.

- [ ] **Step 2: Typecheck**

Run: `npx astro check --minimumSeverity error`
Expected: `0 errors`.

- [ ] **Step 3: Build**

Run: `npx astro build`
Expected: succeeds (`Complete!`).

- [ ] **Step 4: Manual smoke test of the dashboard**

Run: `npx astro dev`, sign in to `/_emdash/admin`, open the admin hub, confirm a new "Équipe" category with a "Notes" tool card is visible, click through to `/_emdash/admin/plugins/cannelle-notes/notes`, and:
1. Fill the create form (title, body, pick an author and an assignee from the selects) and submit — confirm a toast "Note créée." and the note appears under "À faire" with the right assignee shown.
2. Click "Marquer fait" — confirm the note moves to the "Terminé" section.
3. Click "Épingler" on a note, confirm it moves ahead of more-recently-updated notes in its section.
4. Click "Supprimer", confirm the dialog, confirm the note disappears and a toast "Note supprimée." shows.

If any step fails, fix the underlying route/dashboard code in `src/plugins/notes/src/sandbox-entry.ts` and re-run from Step 1.

- [ ] **Step 5: Final commit (only if smoke-test fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found in Cannelle Notes manual smoke test"
```

If no fixes were needed, skip this step — Task 5's commit is already the final state.
