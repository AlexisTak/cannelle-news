import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { GlossaryTerm, SaveTermInput } from "../lib/types";
import { createGlossaryStore } from "../store/glossary-store";

export const saveTermSchema = z.object({
	id: z.string().min(1).optional(),
	term: z.string().min(1).max(120),
	definition: z.string().min(1).max(2000),
	fullUrl: z
		.string()
		.regex(/^https?:\/\/.+|^\/.*/, "L'URL doit être absolue ou commencer par /")
		.nullable()
		.optional(),
	aliases: z.array(z.string().min(1).max(120)).max(20).default([]),
});

export const termIdSchema = z.object({ id: z.string().min(1) });

export interface TermsListOutput {
	terms: GlossaryTerm[];
}

export interface TermOutput {
	term: GlossaryTerm;
}

export async function listTermsRouteHandler(_input: unknown, ctx: PluginContext): Promise<TermsListOutput> {
	return { terms: await createGlossaryStore(ctx).list() };
}

export async function getTermRouteHandler(input: { id: string }, ctx: PluginContext): Promise<TermOutput> {
	const term = await createGlossaryStore(ctx).get(input.id);
	if (!term) throw new Error(`Terme introuvable : ${input.id}`);
	return { term };
}

export async function saveTermRouteHandler(input: SaveTermInput, ctx: PluginContext): Promise<TermOutput> {
	const store = createGlossaryStore(ctx);
	let id = input.id ?? slugify(input.term);
	if (!input.id) {
		const base = id || "terme";
		let suffix = 2;
		while (await store.get(id)) id = `${base}-${suffix++}`;
	}
	await store.save({
		id,
		term: input.term.trim(),
		definition: input.definition.trim(),
		fullUrl: input.fullUrl ?? null,
		aliases: input.aliases?.map((a) => a.trim()).filter(Boolean) ?? [],
	});
	const term = await store.get(id);
	if (!term) throw new Error("Échec de la sauvegarde");
	return { term };
}

export async function deleteTermRouteHandler(input: { id: string }, ctx: PluginContext): Promise<{ ok: true }> {
	await createGlossaryStore(ctx).delete(input.id);
	return { ok: true };
}

function slugify(term: string): string {
	return term
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}
