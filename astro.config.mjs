import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

import { aiEditorialAssistantPlugin } from "./src/plugins/ai-editorial-assistant/src/index.ts";
import { autoInternalLinkerPlugin } from "./src/plugins/auto-internal-linker/src/index.ts";
import { researchPaperEmbedPlugin } from "./src/plugins/research-paper-embed/src/index.ts";
import { seoProPlugin } from "./src/plugins/seo-pro/src/index.ts";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				researchPaperEmbedPlugin(),
				seoProPlugin(),
				autoInternalLinkerPlugin(),
				// `allowedHosts` est figé à la construction du contexte : l'hôte
				// Ollama doit donc être connu ici, un réglage d'admin ne pourrait
				// pas l'ajouter après coup.
				aiEditorialAssistantPlugin({ ollamaHost: "localhost" }),
			],
		}),
	],
	vite: {
		optimizeDeps: {
			include: [
				"@cannelle/plugin-ai-editorial-assistant",
				"@cannelle/plugin-ai-editorial-assistant/admin",
				"@cannelle/plugin-auto-internal-linker",
				"@cannelle/plugin-auto-internal-linker/admin",
				"@cannelle/plugin-research-paper-embed",
				"@cannelle/plugin-research-paper-embed/admin",
				"@cannelle/plugin-seo-pro",
				"@cannelle/plugin-seo-pro/admin",
			],
		},
		ssr: {
			noExternal: [
				"@cannelle/plugin-ai-editorial-assistant",
				"@cannelle/plugin-auto-internal-linker",
				"@cannelle/plugin-research-paper-embed",
				"@cannelle/plugin-seo-pro",
			],
		},
	},
	devToolbar: { enabled: false },
});
