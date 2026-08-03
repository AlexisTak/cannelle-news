import { describe, expect, it } from "vitest";
import { applyLinks } from "./apply-link";

function makeKey(index: number): string {
	return `k${index}`;
}

function doc() {
	return [
		{
			_type: "block",
			_key: "b1",
			style: "normal",
			markDefs: [],
			children: [{ _type: "span", _key: "s1", text: "Un LLM récent", marks: [] }],
		},
	];
}

describe("applyLinks", () => {
	it("découpe le span en trois et déclare le lien", () => {
		const result = applyLinks(
			doc(),
			[{ blockKey: "b1", spanIndex: 0, start: 3, end: 6, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect(result[0].markDefs).toEqual([{ _type: "link", _key: "k0", href: "/posts/llm" }]);
		expect(result[0].children).toEqual([
			{ _type: "span", _key: "s1", text: "Un ", marks: [] },
			{ _type: "span", _key: "s1-k0", text: "LLM", marks: ["k0"] },
			{ _type: "span", _key: "s1-k0-after", text: " récent", marks: [] },
		]);
	});

	it("ne modifie pas les blocs reçus", () => {
		const original = doc();
		applyLinks(
			original,
			[{ blockKey: "b1", spanIndex: 0, start: 3, end: 6, href: "/posts/llm" }],
			makeKey,
		);
		expect(original[0].children).toHaveLength(1);
	});

	it("omet le morceau vide quand le terme ouvre le span", () => {
		const blocks = [
			{
				_type: "block",
				_key: "b1",
				children: [{ _type: "span", _key: "s1", text: "LLM récent", marks: [] }],
			},
		];
		const result = applyLinks(
			blocks,
			[{ blockKey: "b1", spanIndex: 0, start: 0, end: 3, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect((result[0].children as unknown[]).length).toBe(2);
	});

	it("reporte les marks d'origine sur les trois morceaux", () => {
		const blocks = [
			{
				_type: "block",
				_key: "b1",
				children: [{ _type: "span", _key: "s1", text: "Un LLM récent", marks: ["strong"] }],
			},
		];
		const result = applyLinks(
			blocks,
			[{ blockKey: "b1", spanIndex: 0, start: 3, end: 6, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect((result[0].children as Array<Record<string, unknown>>).map((s) => s.marks)).toEqual([
			["strong"],
			["strong", "k0"],
			["strong"],
		]);
	});

	it("applique deux liens du même span sans décaler les offsets", () => {
		const blocks = [
			{
				_type: "block",
				_key: "b1",
				children: [{ _type: "span", _key: "s1", text: "LLM puis RAG", marks: [] }],
			},
		];
		const result = applyLinks(
			blocks,
			[
				{ blockKey: "b1", spanIndex: 0, start: 0, end: 3, href: "/posts/llm" },
				{ blockKey: "b1", spanIndex: 0, start: 9, end: 12, href: "/posts/rag" },
			],
			makeKey,
		) as Array<Record<string, unknown>>;

		const texts = (result[0].children as Array<Record<string, unknown>>).map((s) => s.text);
		expect(texts).toEqual(["LLM", " puis ", "RAG"]);
		expect(result[0].markDefs).toHaveLength(2);
	});

	it("applique des liens dans des blocs différents", () => {
		const blocks = [
			{
				_type: "block",
				_key: "b1",
				children: [{ _type: "span", _key: "s1", text: "un LLM", marks: [] }],
			},
			{
				_type: "block",
				_key: "b2",
				children: [{ _type: "span", _key: "s2", text: "un RAG", marks: [] }],
			},
		];
		const result = applyLinks(
			blocks,
			[
				{ blockKey: "b1", spanIndex: 0, start: 3, end: 6, href: "/posts/llm" },
				{ blockKey: "b2", spanIndex: 0, start: 3, end: 6, href: "/posts/rag" },
			],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect(result[0].markDefs).toHaveLength(1);
		expect(result[1].markDefs).toHaveLength(1);
	});

	it("ignore une pose dont le bloc a disparu", () => {
		const result = applyLinks(
			doc(),
			[{ blockKey: "disparu", spanIndex: 0, start: 0, end: 3, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect(result[0].children).toHaveLength(1);
	});

	it("ignore une pose dont l'index de span n'existe plus", () => {
		const result = applyLinks(
			doc(),
			[{ blockKey: "b1", spanIndex: 7, start: 0, end: 3, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		expect(result[0].children).toHaveLength(1);
	});

	it("descend dans un bloc de liste", () => {
		const blocks = [
			{
				_type: "list",
				_key: "l1",
				children: [
					{
						_type: "block",
						_key: "b1",
						listItem: "bullet",
						children: [{ _type: "span", _key: "s1", text: "un LLM", marks: [] }],
					},
				],
			},
		];
		const result = applyLinks(
			blocks,
			[{ blockKey: "b1", spanIndex: 0, start: 3, end: 6, href: "/posts/llm" }],
			makeKey,
		) as Array<Record<string, unknown>>;

		const item = (result[0].children as Array<Record<string, unknown>>)[0];
		expect(item.markDefs).toEqual([{ _type: "link", _key: "k0", href: "/posts/llm" }]);
	});
});
