import { defineConfig } from "vitest/config";

/**
 * Tests unitaires et d'intégration des plugins de `src/plugins/`.
 *
 * Les fichiers `.astro` et le runtime Cloudflare ne sont pas couverts : ils
 * exigent le pipeline Astro et le binding `cloudflare:workers`. La logique
 * métier des plugins est donc isolée dans des modules Node-compatibles
 * (`src/lib/`) pour rester testable ici.
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/__tests__/**/*.test.ts", "src/plugins/**/*.test.ts"],
	},
});
