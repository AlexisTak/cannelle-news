import { describe, expect, it } from "vitest";
import type { AnalyticsEvent } from "./types";
import { calculateOverview } from "./overview";

const event = (overrides: Partial<AnalyticsEvent>): AnalyticsEvent => ({
	id: crypto.randomUUID(), type: "pageview", path: "/", visitorId: "v1", date: "2026-08-05",
	createdAt: "2026-08-05T10:00:00Z", source: "direct", device: "desktop", properties: {}, ...overrides,
});

describe("calculateOverview", () => {
	it("agrège audience, sources et conversions", () => {
		const overview = calculateOverview([event({}), event({ path: "/article", visitorId: "v2", source: "search" }), event({ type: "form_submit" })]);
		expect(overview).toMatchObject({ pageviews: 2, visitors: 2, events: 3, conversions: 1 });
		expect(overview.topPages[0]).toEqual({ path: "/", views: 1 });
	});
});
