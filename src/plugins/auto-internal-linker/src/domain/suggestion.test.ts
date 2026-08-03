import { describe, expect, it } from "vitest";
import { EMPTY_FIELD_VALUE, readFieldValue } from "./suggestion";

describe("readFieldValue", () => {
	it("retombe sur la forme vide pour null", () => {
		expect(readFieldValue(null)).toEqual(EMPTY_FIELD_VALUE);
	});

	it("retombe sur la forme vide pour une chaîne", () => {
		expect(readFieldValue("nawak")).toEqual(EMPTY_FIELD_VALUE);
	});

	it("conserve une valeur bien formée", () => {
		const value = {
			version: 1,
			manualKeywords: ["LLM"],
			accepted: [{ keyword: "LLM", targetId: "01J", targetUrl: "/posts/llm" }],
			ignored: ["rag"],
		};
		expect(readFieldValue(value)).toEqual(value);
	});

	it("écarte les entrées `accepted` incomplètes sans jeter", () => {
		const read = readFieldValue({
			accepted: [
				{ keyword: "LLM", targetId: "01J", targetUrl: "/posts/llm" },
				{ keyword: "RAG" },
				null,
				"nawak",
			],
		});
		expect(read.accepted).toEqual([{ keyword: "LLM", targetId: "01J", targetUrl: "/posts/llm" }]);
	});

	it("écarte les chaînes vides des tableaux de mots-clés", () => {
		expect(readFieldValue({ manualKeywords: ["LLM", "", "  ", 42] }).manualKeywords).toEqual(["LLM"]);
	});
});
