import { validateBlocks } from "@emdash-cms/blocks/server";
import { expect, it } from "vitest";
import { analyticsDashboard } from "./blocks";

it("produit un tableau de bord Block Kit valide", () => {
	const response = analyticsDashboard({ pageviews: 10, visitors: 5, events: 12, conversions: 2, topPages: [{ path: "/", views: 10 }], sources: [{ source: "direct", visits: 10 }], devices: [{ device: "desktop", visits: 10 }] }, 30, false);
	expect(validateBlocks(response.blocks)).toEqual({ valid: true, errors: [] });
});
