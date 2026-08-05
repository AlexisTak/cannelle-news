import { describe, expect, it } from "vitest";
import { cannelleAnalyticsPlugin } from "./index";

describe("cannelleAnalyticsPlugin", () => {
	it("déclare un plugin standard privacy-first", () => {
		const descriptor = cannelleAnalyticsPlugin();
		expect(descriptor).toMatchObject({ id: "cannelle-analytics", format: "standard", capabilities: ["hooks.page-fragments:register"] });
		expect(Object.keys(descriptor.storage ?? {})).toEqual(["events", "goals", "goalCompletions", "auditLogs"]);
	});
});
