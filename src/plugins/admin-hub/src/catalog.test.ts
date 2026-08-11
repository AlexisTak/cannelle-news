import { describe, expect, it } from "vitest";
import { ADMIN_CATEGORIES } from "./catalog";
import { cannelleAdminHubPlugin, createPlugin } from "./index";

describe("Centre Cannelle", () => {
	it("regroupe les outils en catégories distinctes", () => {
		expect(ADMIN_CATEGORIES.map((item) => item.id)).toEqual(["editorial", "audience", "revenue", "quality", "team"]);
		expect(ADMIN_CATEGORIES.flatMap((item) => item.tools)).toHaveLength(12);
	});
	it("relie les plugins configurables à une page de réglages", () => {
		const tools = ADMIN_CATEGORIES.flatMap((item) => item.tools);
		for (const id of ["media", "fact-check", "analytics", "forms", "newsletter", "paywall"]) expect(tools.find((tool) => tool.id === id)?.settings).toMatch(/^\/_emdash\/admin\/plugins-manager\/.+\/settings$/);
	});
	it("déclare la même page dans le descripteur et le runtime", () => {
		expect(cannelleAdminHubPlugin().adminPages).toEqual(createPlugin().admin?.pages);
	});
});
