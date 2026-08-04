import { definePlugin } from "emdash";
import type { PluginDescriptor, PortableTextBlock } from "emdash";
import { z } from "astro/zod";
import type { SaveTermInput } from "./lib/types";
import {
	deleteTermRouteHandler,
	getTermRouteHandler,
	listTermsRouteHandler,
	saveTermRouteHandler,
	saveTermSchema,
	termIdSchema,
} from "./routes/terms";

export const PLUGIN_ID = "glossary-cards";
export const PLUGIN_VERSION = "0.1.0";

export interface GlossaryCardsOptions extends Record<string, unknown> {
	/** Collections dont le contenu peut recevoir des marks de glossaire. */
	collections?: string[];
}

/** Lu par `astro.config.mjs` au build : dit à EmDash où trouver le code. */
export function glossaryCardsPlugin(options: GlossaryCardsOptions = {}): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		format: "native",
		entrypoint: "@cannelle/plugin-glossary-cards",
		adminEntry: "@cannelle/plugin-glossary-cards/admin",
		componentsEntry: "@cannelle/plugin-glossary-cards/astro",
		options,
		adminPages: [{ path: "/glossary", label: "Glossaire", icon: "book" }],
		fieldWidgets: [
			{
				name: "glossary-term",
				label: "Terme de glossaire",
				fieldTypes: ["json"],
			},
		],
		portableTextBlocks: [
			{
				type: "glossaryTerm",
				label: "Définition de glossaire",
				icon: "book",
				placeholder: "Sélectionnez un terme du glossaire…",
				category: "Inline",
			},
		],
	};
}

/** Lu par EmDash au runtime : capacités, stockage, routes, hooks, UI admin. */
export function createPlugin(options: GlossaryCardsOptions = {}) {
	const collections = options.collections ?? ["posts", "pages"];

	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		capabilities: ["content:read", "content:write"],

		storage: {
			terms: {
				indexes: ["term"],
			},
		},

		admin: {
			entry: "@cannelle/plugin-glossary-cards/admin",
			pages: [{ path: "/glossary", label: "Glossaire", icon: "book" }],
			fieldWidgets: [
				{
					name: "glossary-term",
					label: "Terme de glossaire",
					fieldTypes: ["json"],
				},
			],
			portableTextBlocks: [
				{
					type: "glossaryTerm",
					label: "Définition de glossaire",
					icon: "book",
					placeholder: "Sélectionnez un terme du glossaire…",
					category: "Inline",
				},
			],
		},

		routes: {
			"terms/list": {
				input: z.object({}),
				handler: async (ctx) => listTermsRouteHandler(ctx.input as unknown as Record<string, never>, ctx),
			},
			"terms/get": {
				input: termIdSchema,
				handler: async (ctx) => getTermRouteHandler(ctx.input as { id: string }, ctx),
			},
			"terms/save": {
				input: saveTermSchema,
				handler: async (ctx) => saveTermRouteHandler(ctx.input as SaveTermInput, ctx),
			},
			"terms/delete": {
				input: termIdSchema,
				handler: async (ctx) => deleteTermRouteHandler(ctx.input as { id: string }, ctx),
			},
		},

		hooks: {
			/**
			 * Hydrate les marks de glossaire dans les collections configurées.
			 *
			 * Le hook beforeSave remplace les données du terme par la version
			 * courante du glossaire. Cela permet de corriger la définition ou
			 * l'URL globalement sans repasser sur chaque article.
			 */
			"content:beforeSave": {
				priority: 50,
				errorPolicy: "continue",
				timeout: 3000,
				handler: async (event, ctx) => {
					if (!collections.includes(event.collection)) return;
					const body = event.content.content as PortableTextBlock[] | undefined;
					if (!body?.length) return;

					const { createGlossaryStore } = await import("./store/glossary-store");
					const terms = await createGlossaryStore(ctx).list();
					if (terms.length === 0) return;

					const { hydrateGlossaryMarks } = await import("./lib/portable-text");
					const hydrated = hydrateGlossaryMarks(body, terms);
					if (JSON.stringify(hydrated) !== JSON.stringify(body)) {
						return { ...event.content, content: hydrated };
					}
				},
			},
		},
	});
}

export default createPlugin;
