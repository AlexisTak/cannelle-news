import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

import { aiEditorialAssistantPlugin } from "./src/plugins/ai-editorial-assistant/src/index.ts";
import { cannelleAdminHubPlugin } from "./src/plugins/admin-hub/src/index.ts";
import { cannelleAnalyticsPlugin } from "./src/plugins/analytics/src/index.ts";
import { autoInternalLinkerPlugin } from "./src/plugins/auto-internal-linker/src/index.ts";
import { contentIntegrityPlugin } from "./src/plugins/content-integrity/src/index.ts";
import { cannelleFormsPlugin } from "./src/plugins/forms/src/index.ts";
import { cannelleFactCheckPlugin } from "./src/plugins/fact-check/src/index.ts";
import { glossaryCardsPlugin } from "./src/plugins/glossary-cards/src/index.ts";
import { cannelleMediaPlugin } from "./src/plugins/media/src/index.ts";
import { cannelleNewsletterPlugin } from "./src/plugins/newsletter/src/index.ts";
import { cannelleNotesPlugin } from "./src/plugins/notes/src/index.ts";
import { cannellePaywallPlugin } from "./src/plugins/paywall/src/index.ts";
import { researchPaperEmbedPlugin } from "./src/plugins/research-paper-embed/src/index.ts";
import { seoProPlugin } from "./src/plugins/seo-pro/src/index.ts";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Playfair Display",
			cssVariable: "--font-display",
			weights: [700, 800],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["Georgia", "Times New Roman", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Source Serif 4",
			cssVariable: "--font-body",
			weights: [400, 600],
			styles: ["normal", "italic"],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["Georgia", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-meta",
			weights: [500, 600, 700],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["system-ui", "sans-serif"],
		},
	],
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				cannelleAdminHubPlugin(),
				cannelleAnalyticsPlugin(),
				researchPaperEmbedPlugin(),
				seoProPlugin(),
				autoInternalLinkerPlugin(),
				contentIntegrityPlugin(),
				cannelleFormsPlugin(),
				cannelleMediaPlugin(),
				cannelleFactCheckPlugin(),
				cannellePaywallPlugin(),
				cannelleNotesPlugin(),
				glossaryCardsPlugin(),
				cannelleNewsletterPlugin(),
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
				"@cannelle/plugin-admin-hub",
				"@cannelle/plugin-ai-editorial-assistant",
				"@cannelle/plugin-analytics",
				"@cannelle/plugin-auto-internal-linker",
				"@cannelle/plugin-content-integrity",
				"@cannelle/plugin-forms",
				"@cannelle/plugin-media",
				"@cannelle/plugin-fact-check",
				"@cannelle/plugin-paywall",
				"@cannelle/plugin-glossary-cards",
				"@cannelle/plugin-newsletter",
				"@cannelle/plugin-notes",
				"@cannelle/plugin-glossary-cards/astro",
				"@cannelle/plugin-research-paper-embed",
				"@cannelle/plugin-research-paper-embed/astro",
				"@cannelle/plugin-seo-pro",
			],
		},
		ssr: {
			noExternal: [
				"@cannelle/plugin-admin-hub",
				"@cannelle/plugin-ai-editorial-assistant",
				"@cannelle/plugin-analytics",
				"@cannelle/plugin-auto-internal-linker",
				"@cannelle/plugin-content-integrity",
				"@cannelle/plugin-forms",
				"@cannelle/plugin-media",
				"@cannelle/plugin-fact-check",
				"@cannelle/plugin-paywall",
				"@cannelle/plugin-glossary-cards",
				"@cannelle/plugin-newsletter",
				"@cannelle/plugin-notes",
				"@cannelle/plugin-research-paper-embed",
				"@cannelle/plugin-seo-pro",
			],
		},
	},
	devToolbar: { enabled: false },
});
