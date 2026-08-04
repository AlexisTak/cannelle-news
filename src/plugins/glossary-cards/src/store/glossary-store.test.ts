import { describe, it, expect } from "vitest";
import { createMockPluginContext } from "../../test/mock-ctx";
import { createGlossaryStore } from "./glossary-store";

describe("createGlossaryStore", () => {
	async function setup() {
		const ctx = createMockPluginContext();
		const store = createGlossaryStore(ctx as unknown as Parameters<typeof createGlossaryStore>[0]);
		return { ctx, store };
	}

	it("saves and retrieves a term", async () => {
		const { store } = await setup();
		await store.save({
			id: "llm",
			term: "LLM",
			definition: "Large Language Model",
			fullUrl: "/glossaire/llm",
			aliases: ["large language model"],
		});
		const term = await store.get("llm");
		expect(term?.term).toBe("LLM");
		expect(term?.aliases).toContain("large language model");
	});

	it("finds a term by alias", async () => {
		const { store } = await setup();
		await store.save({
			id: "phishing",
			term: "Hameçonnage",
			definition: "Attaque par ingénierie sociale visant à subtiliser des informations.",
			fullUrl: null,
			aliases: ["phishing", "hameçonnage informatique"],
		});
		const found = await store.findByTerm("phishing");
		expect(found?.term).toBe("Hameçonnage");
	});

	it("normalizes accents when matching", async () => {
		const { store } = await setup();
		await store.save({
			id: "ia",
			term: "Intelligence artificielle",
			definition: "Simulation de capacités cognitives par une machine.",
			fullUrl: null,
			aliases: [],
		});
		const found = await store.findByTerm("intelligence artificielle");
		expect(found?.term).toBe("Intelligence artificielle");
	});

	it("deletes a term", async () => {
		const { store } = await setup();
		await store.save({
			id: "xss",
			term: "XSS",
			definition: "Cross-Site Scripting",
			fullUrl: null,
			aliases: [],
		});
		await store.delete("xss");
		expect(await store.get("xss")).toBeNull();
	});
});
