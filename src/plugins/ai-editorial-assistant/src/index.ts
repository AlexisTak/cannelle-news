import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { toRouteResult } from "./routes/result";
import { SETTINGS_SCHEMA } from "./settings-schema";
import {
	applySeoInputSchema,
	applySeoRouteHandler,
	type ApplySeoInput,
} from "./routes/apply-seo";
import { generateInputSchema, generateRouteHandler, type GenerateInput } from "./routes/generate";
import {
	paragraphsInputSchema,
	paragraphsRouteHandler,
	type ParagraphsInput,
} from "./routes/paragraphs";
import { promptsInputSchema, promptsRouteHandler, type PromptsInput } from "./routes/prompts";
import {
	missingMetaInputSchema,
	missingMetaRouteHandler,
	type MissingMetaInput,
} from "./routes/missing-meta";

export const PLUGIN_ID = "ai-editorial-assistant";
export const PLUGIN_VERSION = "0.1.0";

export interface AiEditorialAssistantOptions extends Record<string, unknown> {
	/**
	 * Hôte de l'instance Ollama, ajouté à `allowedHosts`.
	 *
	 * Doit être décidé au build : `createHttpAccess` fige la liste à la
	 * construction du contexte (`emdash/dist/context-B6hc7zJL.mjs:790`), un
	 * réglage d'admin ne pourrait pas l'élargir. La validation porte sur le
	 * nom d'hôte seul, le port est ignoré.
	 */
	ollamaHost?: string;
}

// Les types de configuration d'EmDash (`FieldWidgetConfig`, `SettingField`…)
// ne sont pas tous exportés publiquement : on les dérive du descripteur, qui
// l'est. Le contrôle de type reste complet sans import de chemin interne.
type FieldWidgets = NonNullable<PluginDescriptor["fieldWidgets"]>;
type PortableTextBlocks = NonNullable<PluginDescriptor["portableTextBlocks"]>;
type AdminPages = NonNullable<PluginDescriptor["adminPages"]>;

/** Widgets de champ exposés à l'éditeur de contenu. */
const FIELD_WIDGETS: FieldWidgets = [
	{
		name: "panel",
		label: "Assistant IA — titres, meta description, vulgarisation",
		fieldTypes: ["json"],
	},
	{
		name: "tldr",
		label: "Assistant IA — TL;DR en 3 puces",
		fieldTypes: ["json"],
	},
];

/** Blocs insérables dans le corps Portable Text. */
const PORTABLE_TEXT_BLOCKS: PortableTextBlocks = [
	{
		type: "aiTldr",
		label: "Encadré TL;DR",
		icon: "code",
		placeholder: "Trois points clés…",
		// L'UI d'édition d'un bloc est du Block Kit déclaratif : impossible d'y
		// mettre un bouton « Générer ». La génération vit dans le widget du
		// champ `tldr`, ce bloc sert au placement libre dans l'article.
		fields: [
			{ type: "text_input", action_id: "bullet1", label: "Point 1" },
			{ type: "text_input", action_id: "bullet2", label: "Point 2" },
			{ type: "text_input", action_id: "bullet3", label: "Point 3" },
		],
	},
];

const ADMIN_PAGES: AdminPages = [{ path: "/prompts", label: "Prompts IA", icon: "settings" }];

/** Lu par `astro.config.mjs` au build : dit à EmDash où trouver le code. */
export function aiEditorialAssistantPlugin(
	options: AiEditorialAssistantOptions = {},
): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		format: "native",
		entrypoint: "@cannelle/plugin-ai-editorial-assistant",
		adminEntry: "@cannelle/plugin-ai-editorial-assistant/admin",
		componentsEntry: "@cannelle/plugin-ai-editorial-assistant/astro",
		options,
		settingsSchema: SETTINGS_SCHEMA,
		adminPages: ADMIN_PAGES,
		adminWidgets: [{ id: "missing-meta", title: "Articles sans TL;DR/meta", size: "half" }],
		fieldWidgets: FIELD_WIDGETS,
		portableTextBlocks: PORTABLE_TEXT_BLOCKS,
	};
}

/** Lu par EmDash au runtime : capacités, routes, UI admin. */
export function createPlugin(options: AiEditorialAssistantOptions = {}) {
	const ollamaHost = options.ollamaHost ?? "localhost";

	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,

		// `content:write` sert uniquement à la route `apply-seo`, qui n'écrit
		// que la clé réservée `seo` — jamais un champ de contenu.
		capabilities: ["content:read", "content:write", "network:request"],
		allowedHosts: ["api.openai.com", "api.anthropic.com", ollamaHost],

		admin: {
			entry: "@cannelle/plugin-ai-editorial-assistant/admin",
			settingsSchema: SETTINGS_SCHEMA,
			pages: ADMIN_PAGES,
			widgets: [{ id: "missing-meta", title: "Articles sans TL;DR/meta", size: "half" }],
			fieldWidgets: FIELD_WIDGETS,
			portableTextBlocks: PORTABLE_TEXT_BLOCKS,
		},

		routes: {
			// `RouteContext` étend `PluginContext` : le contexte *est* le premier
			// argument, il n'y en a pas de second.
			generate: {
				input: generateInputSchema,
				handler: async (ctx) =>
					toRouteResult(() =>generateRouteHandler(ctx.input as GenerateInput, ctx)),
			},
			"apply-seo": {
				input: applySeoInputSchema,
				handler: async (ctx) =>
					toRouteResult(() =>applySeoRouteHandler(ctx.input as ApplySeoInput, ctx)),
			},
			paragraphs: {
				input: paragraphsInputSchema,
				handler: async (ctx) =>
					toRouteResult(() =>paragraphsRouteHandler(ctx.input as ParagraphsInput, ctx)),
			},
			prompts: {
				input: promptsInputSchema,
				handler: async (ctx) =>
					toRouteResult(() =>promptsRouteHandler(ctx.input as PromptsInput, ctx)),
			},
			"missing-meta": {
				input: missingMetaInputSchema,
				handler: async (ctx) =>
					toRouteResult(() =>missingMetaRouteHandler(ctx.input as MissingMetaInput, ctx)),
			},
		},
	});
}

export default createPlugin;
