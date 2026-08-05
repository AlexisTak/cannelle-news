import { describe, expect, it } from "vitest";
import { retentionCutoff } from "@cannelle/plugin-core";

describe("rétention Analytics", () => {
	it("calcule une date de purge quotidienne stable", () => {
		expect(retentionCutoff({ days: 30, mode: "delete" }, new Date("2026-08-05T00:00:00Z")).toISOString()).toBe("2026-07-06T00:00:00.000Z");
	});
});
