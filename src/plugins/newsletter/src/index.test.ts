import { describe, expect, it } from "vitest";
import { cannelleNewsletterPlugin } from "./index";

describe("cannelleNewsletterPlugin", () => {
	it("déclare les stockages et la capacité e-mail", () => {
		const descriptor = cannelleNewsletterPlugin(); expect(descriptor).toMatchObject({ id: "cannelle-newsletter", format: "standard", capabilities: ["email:send"] });
		expect(Object.keys(descriptor.storage ?? {})).toEqual(["subscribers", "lists", "campaigns", "deliveries", "consents", "templates", "suppressions"]);
	});
});
