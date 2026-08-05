import { describe, expect, it } from "vitest";
import { cannelleMediaPlugin } from "./media/src/index";
import { cannelleFactCheckPlugin } from "./fact-check/src/index";
import { cannellePaywallPlugin } from "./paywall/src/index";

describe("suite Contenu Cannelle", () => {
	it("déclare trois plugins standard avec stockage et administration", () => {
		for (const plugin of [cannelleMediaPlugin(), cannelleFactCheckPlugin(), cannellePaywallPlugin()]) {
			expect(plugin.format).toBe("standard");
			expect(plugin.entrypoint).toMatch(/^@cannelle\//);
			expect(plugin.adminPages).toHaveLength(1);
			expect(Object.keys(plugin.storage ?? {}).length).toBeGreaterThan(2);
		}
	});
	it("limite les capacités au strict nécessaire", () => {
		expect(cannelleMediaPlugin().capabilities).toContain("media:read");
		expect(cannelleFactCheckPlugin().capabilities).toContain("network:request:unrestricted");
		expect(cannellePaywallPlugin().capabilities).toContain("hooks.page-fragments:register");
	});
});
