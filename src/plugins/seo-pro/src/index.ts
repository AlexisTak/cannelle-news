import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { analyzeRouteHandler, analyzeInputSchema, focusKey, type AnalyzeInput } from "./routes/analyze";
import { reportsRouteHandler, reportsInputSchema, type ReportsInput } from "./routes/reports";
import { reportRouteHandler, reportInputSchema, type ReportInput } from "./routes/report";
import {
	focusKeywordRouteHandler,
	focusKeywordInputSchema,
	type FocusKeywordInput,
} from "./routes/focus-keyword";
import { settingsRouteHandler, settingsInputSchema, type SettingsInput } from "./routes/settings";
import { loadSeoDocument } from "./infrastructure/content-loader";
import { analyze } from "./analysis/analyze";
import { createKvConfigStore } from "./infrastructure/kv-config";
import { createStorageReportStore } from "./infrastructure/storage-report-store";

export const ENGINE_VERSION = "1.0.0";

/** Lu par `astro.config.mjs` au build : dit à EmDash où trouver le code. */
export function seoProPlugin(): PluginDescriptor {
	return {
		id: "seo-pro",
		version: "0.1.0",
		format: "native",
		entrypoint: "@cannelle/plugin-seo-pro",
		adminEntry: "@cannelle/plugin-seo-pro/admin",
		// `/entry` n'est pas listé ici : la page n'a de sens qu'avec un article
		// en query string, et un lien de barre latérale sans paramètre
		// n'afficherait qu'une erreur. On y arrive depuis le dashboard.
		adminPages: [
			{ path: "/dashboard", label: "SEO Dashboard", icon: "bar-chart" },
			{ path: "/settings", label: "SEO Settings", icon: "settings" },
		],
		adminWidgets: [{ id: "seo-overview", title: "SEO Overview", size: "half" }],
	};
}

/** Lu par EmDash au runtime : capacités, stockage, routes, hooks, UI admin. */
export function createPlugin() {
	return definePlugin({
		id: "seo-pro",
		version: "0.1.0",
		capabilities: ["content:read", "media:read", "taxonomies:read"],

		storage: {
			reports: {
				indexes: ["collection", "score", "analyzedAt", ["collection", "score"]],
			},
		},

		admin: {
			entry: "@cannelle/plugin-seo-pro/admin",
			pages: [
				{ path: "/dashboard", label: "SEO Dashboard", icon: "bar-chart" },
				{ path: "/settings", label: "SEO Settings", icon: "settings" },
			],
			widgets: [{ id: "seo-overview", title: "SEO Overview", size: "half" }],
		},

		routes: {
			// `RouteContext` étend `PluginContext` : le contexte *est* le premier
			// argument, il n'y en a pas de second (`types.ts:1201`).
			analyze: {
				input: analyzeInputSchema,
				handler: async (ctx) => analyzeRouteHandler(ctx.input as AnalyzeInput, ctx),
			},
			reports: {
				input: reportsInputSchema,
				handler: async (ctx) => reportsRouteHandler(ctx.input as ReportsInput, ctx),
			},
			report: {
				input: reportInputSchema,
				handler: async (ctx) => reportRouteHandler(ctx.input as ReportInput, ctx),
			},
			"focus-keyword": {
				input: focusKeywordInputSchema,
				handler: async (ctx) =>
					focusKeywordRouteHandler(ctx.input as FocusKeywordInput, ctx),
			},
			settings: {
				input: settingsInputSchema,
				handler: async (ctx) => settingsRouteHandler(ctx.input as SettingsInput, ctx),
			},
		},

		hooks: {
			"content:afterSave": {
				priority: 100,
				// `continue` : une analyse SEO ratée ne doit jamais empêcher un
				// rédacteur d'enregistrer son article.
				errorPolicy: "continue",
				timeout: 5000,
				handler: async (event, ctx) => {
					const config = await createKvConfigStore(ctx).get();
					if (!config.analyzableCollections.includes(event.collection)) return;

					const entryId = String(event.content.id ?? "");
					if (!entryId) return;

					// `ContentHookEvent.content` est déjà plat — pas de `.data` à
					// aplatir ici, contrairement au chemin des routes.
					const doc = await loadSeoDocument(ctx, event.content, event.collection);
					const manualFocus = await ctx.kv.get<string | null>(focusKey(entryId));
					const report = analyze(doc, config, manualFocus ?? undefined, ENGINE_VERSION);

					await createStorageReportStore(ctx).put(report);
					ctx.log.info(`[seo-pro] ${event.collection}/${entryId} scored ${report.score}`);
				},
			},
		},
	});
}

export default createPlugin;
