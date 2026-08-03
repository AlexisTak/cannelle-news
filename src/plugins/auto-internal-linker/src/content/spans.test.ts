import { describe, expect, it } from "vitest";
import { collectLinkHrefs, collectLinkableSpans, findBlockByKey } from "./spans";

const paragraph = {
	_type: "block",
	_key: "b1",
	style: "normal",
	children: [{ _type: "span", _key: "s1", text: "Un LLM récent", marks: [] }],
};

const heading = {
	_type: "block",
	_key: "b2",
	style: "h2",
	children: [{ _type: "span", _key: "s2", text: "Le LLM en bref", marks: [] }],
};

const linked = {
	_type: "block",
	_key: "b3",
	style: "normal",
	markDefs: [{ _type: "link", _key: "l1", href: "/posts/llm" }],
	children: [
		{ _type: "span", _key: "s3", text: "Voir ", marks: [] },
		{ _type: "span", _key: "s4", text: "le LLM", marks: ["l1"] },
	],
};

const code = { _type: "code", _key: "b4", code: "const llm = 1;", language: "ts" };

describe("collectLinkableSpans", () => {
	it("retient les spans d'un paragraphe ordinaire", () => {
		expect(collectLinkableSpans([paragraph])).toEqual([
			{ blockKey: "b1", spanIndex: 0, text: "Un LLM récent" },
		]);
	});

	it("écarte les intertitres", () => {
		expect(collectLinkableSpans([heading])).toEqual([]);
	});

	it("écarte les blocs de code", () => {
		expect(collectLinkableSpans([code])).toEqual([]);
	});

	it("écarte le span déjà porteur d'un lien mais garde ses voisins", () => {
		expect(collectLinkableSpans([linked])).toEqual([
			{ blockKey: "b3", spanIndex: 0, text: "Voir " },
		]);
	});

	it("conserve un mark de style qui n'est pas un lien", () => {
		const bold = {
			_type: "block",
			_key: "b5",
			children: [{ _type: "span", _key: "s5", text: "un LLM", marks: ["strong"] }],
		};
		expect(collectLinkableSpans([bold])).toEqual([
			{ blockKey: "b5", spanIndex: 0, text: "un LLM" },
		]);
	});

	it("descend dans les blocs de liste", () => {
		const list = {
			_type: "list",
			_key: "b6",
			children: [
				{
					_type: "block",
					_key: "b7",
					listItem: "bullet",
					children: [{ _type: "span", _key: "s6", text: "un RAG", marks: [] }],
				},
			],
		};
		expect(collectLinkableSpans([list])).toEqual([
			{ blockKey: "b7", spanIndex: 0, text: "un RAG" },
		]);
	});

	it("ignore un bloc sans _key, qu'on ne saurait pas retrouver pour écrire", () => {
		const orphan = {
			_type: "block",
			children: [{ _type: "span", text: "un LLM", marks: [] }],
		};
		expect(collectLinkableSpans([orphan])).toEqual([]);
	});

	it("ignore un span au texte vide", () => {
		const empty = {
			_type: "block",
			_key: "b8",
			children: [{ _type: "span", _key: "s7", text: "", marks: [] }],
		};
		expect(collectLinkableSpans([empty])).toEqual([]);
	});
});

describe("collectLinkHrefs", () => {
	it("remonte les href de tous les markDefs de lien", () => {
		expect(collectLinkHrefs([paragraph, linked])).toEqual(["/posts/llm"]);
	});

	it("remonte aussi les liens des intertitres, qui comptent dans le plafond", () => {
		const linkedHeading = {
			_type: "block",
			_key: "b9",
			style: "h2",
			markDefs: [{ _type: "link", _key: "l2", href: "/posts/rag" }],
			children: [{ _type: "span", _key: "s8", text: "le RAG", marks: ["l2"] }],
		};
		expect(collectLinkHrefs([linkedHeading])).toEqual(["/posts/rag"]);
	});
});

describe("findBlockByKey", () => {
	it("retrouve un bloc imbriqué dans une liste", () => {
		const list = {
			_type: "list",
			_key: "b6",
			children: [{ _type: "block", _key: "b7", children: [] }],
		};
		expect(findBlockByKey([list], "b7")).toMatchObject({ _key: "b7" });
	});

	it("retourne null pour une clé absente", () => {
		expect(findBlockByKey([paragraph], "nope")).toBeNull();
	});
});
