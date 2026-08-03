import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { applyAcceptedLinks } from "./infrastructure/apply-accepted";
import { createKvConfigStore } from "./infrastructure/kv-config";
import { indexEntry } from "./infrastructure/index-entry";
import { createKeywordIndexStore } from "./infrastructure/keyword-index-store";
import { rebuildRouteHandler, rebuildInputSchema, type RebuildInput } from "./routes/rebuild";
import { toRouteResult } from "./routes/result";
import { settingsRouteHandler, settingsInputSchema, type SettingsInput } from "./routes/settings";
import { suggestRouteHandler, suggestInputSchema, type SuggestInput } from "./routes/suggest";

export const PLUGIN_ID = "auto-internal-linker";
export const PLUGIN_VERSION = "0.1.0";

/** Lu par `astro.config.mjs` au build : dit à EmDash où trouver le code. */
export function autoInternalLinkerPlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		format: "native",
		entrypoint: "@cannelle/plugin-auto-internal-linker",
		adminEntry: "@cannelle/plugin-auto-internal-linker/admin",
		adminPages: [{ path: "/settings", label: "Maillage interne", icon: "link" }],
		fieldWidgets: [
			{
				name: "suggestions",
				label: "Suggestions de liens internes",
				fieldTypes: ["json"],
			},
		],
	};
}

/** Lu par EmDash au runtime : capacités, stockage, routes, hooks, UI admin. */
export function createPlugin() {
	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,

		// `content:write` n'est pas demandé : le plugin ne modifie jamais par
		// `ctx.content.update()`. Le `content:beforeSave` retourne le contenu
		// transformé dans le flux d'enregistrement normal.
		capabilities: ["content:read", "taxonomies:read"],

		storage: {
			keywords: {
				indexes: ["normalized", "targetId", "source", ["normalized", "weight"]],
			},
		},

		admin: {
			entry: "@cannelle/plugin-auto-internal-linker/admin",
			pages: [{ path: "/settings", label: "Maillage interne", icon: "link" }],
			fieldWidgets: [
				{
					name: "suggestions",
					label: "Suggestions de liens internes",
					fieldTypes: ["json"],
				},
			],
		},

		routes: {
			// `RouteContext` étend `PluginContext` : le contexte *est* le premier
			// argument, il n'y en a pas de second.
			suggest: {
				input: suggestInputSchema,
				handler: async (ctx) =>
					toRouteResult(() => suggestRouteHandler(ctx.input as SuggestInput, ctx)),
			},
			rebuild: {
				input: rebuildInputSchema,
				handler: async (ctx) =>
					toRouteResult(() => rebuildRouteHandler(ctx.input as RebuildInput, ctx)),
			},
			settings: {
				input: settingsInputSchema,
				handler: async (ctx) =>
					toRouteResult(() => settingsRouteHandler(ctx.input as SettingsInput, ctx)),
			},
		},

		hooks: {
			"content:afterPublish": {
				priority: 100,
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					await indexEntry(ctx, event.content, event.collection);
				},
			},

			"content:afterSave": {
				priority: 100,
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					// Seul un article publié doit rester indexé : un brouillon
					// enregistré ne doit pas apparaître dans les suggestions.
					if (event.content.status !== "published") return;
					await indexEntry(ctx, event.content, event.collection);
				},
			},

			"content:afterUnpublish": {
				priority: 100,
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					const id = String(event.content.id ?? "");
					if (id) await createKeywordIndexStore(ctx).purgeTarget(id);
				},
			},

			/**
			 * Purge, corbeille comprise.
			 *
			 * Ne pas filtrer sur `event.permanent` : une mise à la corbeille émet
			 * ce hook avec `permanent: false` et **n'émet pas**
			 * `content:afterUnpublish` (`emdash-runtime.ts:2968` contre `:3055`).
			 * Sans purge ici, l'article resterait une cible de liens alors que son
			 * URL rend un 404 — exactement le contraire du but du plugin.
			 */
			"content:afterDelete": {
				priority: 100,
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					if (event.id) await createKeywordIndexStore(ctx).purgeTarget(event.id);
				},
			},

			/**
			 * Contrepartie de la purge ci-dessus : sortir un article de la
			 * corbeille doit le rendre à nouveau ciblable, sans attendre qu'un
			 * rédacteur pense à le rouvrir pour l'enregistrer.
			 */
			"content:afterRestore": {
				priority: 100,
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					if (event.content.status !== "published") return;
					await indexEntry(ctx, event.content, event.collection);
				},
			},

			"content:beforeSave": {
				priority: 100,
				// Pas de `errorPolicy: "continue"` ici : ce hook doit retourner le
				// contenu, même si l'analyse échoue. On gère donc les erreurs en
				// interne et on retourne le contenu intact.
				timeout: 5000,
				handler: async (event, ctx) => {
					try {
						const config = await createKvConfigStore(ctx).get();
						if (!config.analyzableCollections.includes(event.collection)) return;

						const linked = applyAcceptedLinks(event.content, config);
						if (linked) return { ...event.content, content: linked };
					} catch (error) {
						ctx.log.error(`[auto-internal-linker] beforeSave failed: ${error}`);
					}
				},
			},
		},
	});
}

export default createPlugin;
