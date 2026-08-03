import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

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
			plugins: [researchPaperEmbedPlugin(), seoProPlugin()],
		}),
	],
	vite: {
		optimizeDeps: {
			include: [
				"@cannelle/plugin-research-paper-embed",
				"@cannelle/plugin-research-paper-embed/admin",
				"@cannelle/plugin-seo-pro",
				"@cannelle/plugin-seo-pro/admin",
			],
		},
		ssr: {
			noExternal: ["@cannelle/plugin-research-paper-embed", "@cannelle/plugin-seo-pro"],
		},
	},
	devToolbar: { enabled: false },
});
