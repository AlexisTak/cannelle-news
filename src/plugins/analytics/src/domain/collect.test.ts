import { describe, expect, it } from "vitest";
import { classifyDevice, collectInputSchema, isKnownBot, trafficSource } from "./collect";

describe("collecte analytics", () => {
	it("valide un événement minimal", () => expect(collectInputSchema.safeParse({ path: "/article" }).success).toBe(true));
	it("refuse une URL absolue", () => expect(collectInputSchema.safeParse({ path: "https://evil.test" }).success).toBe(false));
	it("classe les appareils", () => {
		expect(classifyDevice("Mozilla iPhone Mobile")).toBe("mobile");
		expect(classifyDevice("Mozilla iPad Tablet")).toBe("tablet");
		expect(classifyDevice("Mozilla Firefox Linux")).toBe("desktop");
	});
	it("détecte les robots", () => expect(isKnownBot("Googlebot/2.1")).toBe(true));
	it("classe les sources", () => {
		expect(trafficSource(null, "https://site.test")).toBe("direct");
		expect(trafficSource("https://site.test/page", "https://site.test")).toBe("internal");
		expect(trafficSource("https://www.google.fr/search", "https://site.test")).toBe("search");
	});
});
