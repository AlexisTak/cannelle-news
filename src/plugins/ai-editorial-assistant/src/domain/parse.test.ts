import { describe, expect, it } from "vitest";
import { extractJson, parseStringList, parseTextField, stripCodeFence } from "./parse";

describe("stripCodeFence", () => {
	it("unwraps a fenced json block", () => {
		expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
	});

	it("leaves unfenced text untouched", () => {
		expect(stripCodeFence("  plain  ")).toBe("plain");
	});
});

describe("extractJson", () => {
	it("finds a literal after a preamble", () => {
		expect(extractJson('Voici les titres :\n["A", "B"]')).toEqual(["A", "B"]);
	});

	it("does not stop on a brace inside a string", () => {
		// Une accolade dans un titre ferait échouer un découpage par indexOf.
		expect(extractJson('["Le format {json} expliqué"]')).toEqual(["Le format {json} expliqué"]);
	});

	it("skips a malformed literal and keeps looking", () => {
		expect(extractJson('{oops} then {"description":"ok"}')).toEqual({ description: "ok" });
	});

	it("returns null when there is no literal", () => {
		expect(extractJson("aucun json ici")).toBeNull();
	});
});

describe("parseStringList", () => {
	it("reads a plain json array", () => {
		expect(parseStringList('["A","B","C"]')).toEqual(["A", "B", "C"]);
	});

	it("unwraps a single-key object holding the array", () => {
		expect(parseStringList('{"titles":["A","B"]}')).toEqual(["A", "B"]);
	});

	it("reads objects inside the array", () => {
		expect(parseStringList('[{"title":"A"},{"title":"B"}]')).toEqual(["A", "B"]);
	});

	it("reads an object whose values are the entries", () => {
		// Forme rendue par qwen3.5:4b en mode format:"json", constatée en test réel.
		const raw = '{"point_1":"Premier","point_2":"Deuxième","point_3":"Troisième"}';
		expect(parseStringList(raw)).toEqual(["Premier", "Deuxième", "Troisième"]);
	});

	it("prefers a nested array over the object values", () => {
		const raw = '{"note":"ignorée","titles":["A","B"]}';
		expect(parseStringList(raw)).toEqual(["A", "B"]);
	});

	it("falls back to bullet lines when the model ignores json", () => {
		const raw = "- Premier titre\n* Deuxième titre\n3. Troisième titre";
		expect(parseStringList(raw)).toEqual(["Premier titre", "Deuxième titre", "Troisième titre"]);
	});

	it("drops duplicates case-insensitively", () => {
		expect(parseStringList('["Titre","titre","Autre"]')).toEqual(["Titre", "Autre"]);
	});

	it("drops empty entries", () => {
		expect(parseStringList('["A","","  ","B"]')).toEqual(["A", "B"]);
	});
});

describe("parseTextField", () => {
	it("reads the requested key", () => {
		expect(parseTextField('{"description":"Une description"}', "description")).toBe(
			"Une description",
		);
	});

	it("accepts a differently named key", () => {
		// Le modèle a fait le travail ; le nom de clé n'est qu'une question de forme.
		expect(parseTextField('{"meta_description":"Une description"}', "description")).toBe(
			"Une description",
		);
	});

	it("falls back to free text and removes surrounding quotes", () => {
		expect(parseTextField('"Une description libre"', "description")).toBe(
			"Une description libre",
		);
	});
});
