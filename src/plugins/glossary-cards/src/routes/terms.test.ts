import { describe, it, expect } from "vitest";
import { createMockPluginContext } from "../../test/mock-ctx";
import { saveTermRouteHandler } from "./terms";

describe("saveTermRouteHandler", () => {
	it("génère un slug unique quand le terme de base existe déjà", async () => {
		const ctx = createMockPluginContext();
		await saveTermRouteHandler({ term: "LLM", definition: "d1" }, ctx);
		const second = await saveTermRouteHandler({ term: "LLM", definition: "d2" }, ctx);
		expect(second.term.id).toBe("llm-2");
	});

	it("conserve l'id fourni en mode édition", async () => {
		const ctx = createMockPluginContext();
		await saveTermRouteHandler({ id: "custom", term: "LLM", definition: "d" }, ctx);
		const edited = await saveTermRouteHandler({ id: "custom", term: "LLM édité", definition: "d2" }, ctx);
		expect(edited.term.id).toBe("custom");
	});
});
