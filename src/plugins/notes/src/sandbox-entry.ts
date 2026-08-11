import type { PluginContext, SandboxedPlugin, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import { blocks, elements, type BlockInteraction, type BlockResponse } from "@emdash-cms/blocks/server";
import { filterByStatus, sortNotes, type Note } from "./domain";

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

const notesInputSchema = z.object({ status: z.enum(["todo", "done"]).optional() });

async function notesRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const parsed = notesInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw new Response("Invalid input", { status: 400 });
	const result = await store(ctx).notes.query({ limit: 200 });
	const sorted = sortNotes(result.items.map((x) => x.data));
	const notes = parsed.data.status ? filterByStatus(sorted, parsed.data.status) : sorted;
	return { notes };
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

async function usersToOptions(ctx: PluginContext) {
	if (!ctx.users) return [];
	const result = await ctx.users.list({ limit: 100 });
	return result.items.map((u) => ({ label: u.name ?? u.email, value: u.id }));
}

function noteBlocks(note: Note) {
	const meta = note.assigneeName ? `Assigné à ${note.assigneeName} — par ${note.authorName}` : `Par ${note.authorName}`;
	return [
		blocks.section(note.title),
		blocks.section(note.body),
		blocks.context(meta),
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
	const todo = filterByStatus(notes, "todo");
	const done = filterByStatus(notes, "done");
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
					elements.select("authorId", "Auteur", userOptions, { initialValue: userOptions[0]?.value }),
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

export default {
	hooks: {},
	routes: {
		notes: { permission: "plugins:read", input: notesInputSchema, handler: notesRoute },
		create: { permission: "plugins:manage", input: z.unknown(), handler: createRoute },
		update: { permission: "plugins:manage", input: z.unknown(), handler: updateRoute },
		delete: { permission: "plugins:manage", input: z.unknown(), handler: deleteRoute },
		admin: {
			permission: "plugins:manage",
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
