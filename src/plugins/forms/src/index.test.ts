import { describe, expect, it } from "vitest";
import { cannelleFormsPlugin } from "./index";

describe("cannelleFormsPlugin", () => {
	it("déclare un plugin standard et son stockage", () => {
		const descriptor = cannelleFormsPlugin();
		expect(descriptor).toMatchObject({
			id: "cannelle-forms",
			version: "0.1.0",
			format: "standard",
			entrypoint: "@cannelle/plugin-forms/sandbox",
		});
		expect(Object.keys(descriptor.storage ?? {})).toEqual(["forms", "formVersions", "submissions", "auditLogs", "eventOutbox", "notificationJobs"]);
	});
});
