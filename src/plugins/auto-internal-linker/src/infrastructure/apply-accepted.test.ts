import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../domain/config";
import { applyAcceptedLinks } from "./apply-accepted";

function content(text: string, accepted: Array<{ keyword: string; targetId: string; targetUrl: string }>) {
	return {
		id: "01J",
		slug: "article",
		title: "Article",
		content: [
			{
				_type: "block",
				_key: "b1",
				style: "normal",
				markDefs: [],
				children: [{ _type: "span", _key: "s1", text, marks: [] }],
			},
		],
		internal_links: { version: 1, manualKeywords: [], accepted, ignored: [] },
	};
}

const acceptedLlm = [{ keyword: "LLM", targetId: "a", targetUrl: "/posts/llm" }];

describe("applyAcceptedLinks", () => {
	it("pose le lien accepté sur le terme trouvé", () => {
		const body = applyAcceptedLinks(content("Un LLM récent", acceptedLlm), DEFAULT_CONFIG);
		const block = (body as Array<Record<string, unknown>>)[0];

		expect(block.markDefs).toMatchObject([{ _type: "link", href: "/posts/llm" }]);
		expect((block.children as Array<Record<string, unknown>>).map((s) => s.text)).toEqual([
			"Un ",
			"LLM",
			" récent",
		]);
	});

	it("retrouve le terme malgré la casse et les accents", () => {
		const accepted = [{ keyword: "modèle de langue", targetId: "a", targetUrl: "/posts/mdl" }];
		const body = applyAcceptedLinks(content("Le Modele De Langue apprend", accepted), DEFAULT_CONFIG);
		const block = (body as Array<Record<string, unknown>>)[0];
		expect(block.markDefs).toHaveLength(1);
	});

	it("ignore en silence une décision dont le terme a disparu", () => {
		expect(applyAcceptedLinks(content("Texte réécrit", acceptedLlm), DEFAULT_CONFIG)).toBeNull();
	});

	it("retourne null quand rien n'est accepté", () => {
		expect(applyAcceptedLinks(content("Un LLM récent", []), DEFAULT_CONFIG)).toBeNull();
	});

	it("est idempotent : rejouer ne pose pas de second lien", () => {
		const first = applyAcceptedLinks(content("Un LLM récent", acceptedLlm), DEFAULT_CONFIG);
		const replayed = applyAcceptedLinks(
			{ ...content("Un LLM récent", acceptedLlm), content: first },
			DEFAULT_CONFIG,
		);
		expect(replayed).toBeNull();
	});

	it("ne pose rien dans un intertitre", () => {
		const doc = content("Un LLM récent", acceptedLlm);
		(doc.content[0] as Record<string, unknown>).style = "h2";
		expect(applyAcceptedLinks(doc, DEFAULT_CONFIG)).toBeNull();
	});

	it("respecte le plafond de liens par article", () => {
		const accepted = [
			{ keyword: "LLM", targetId: "a", targetUrl: "/posts/llm" },
			{ keyword: "RAG", targetId: "b", targetUrl: "/posts/rag" },
		];
		const config = { ...DEFAULT_CONFIG, maxLinksPerEntry: 1 };
		const body = applyAcceptedLinks(content("Un LLM et un RAG", accepted), config);
		expect((body as Array<Record<string, unknown>>)[0].markDefs).toHaveLength(1);
	});
});
