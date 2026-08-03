import { describe, expect, it } from "vitest";
import { buildTrie, scanTrie } from "./trie";

function trieOf(...keys: string[]) {
	return buildTrie(keys.map((key) => ({ key, value: key })));
}

describe("scanTrie", () => {
	it("trouve un terme isolé", () => {
		const matches = scanTrie("un llm recent", trieOf("llm"));
		expect(matches).toEqual([{ start: 3, end: 6, value: "llm" }]);
	});

	it("ignore une correspondance en milieu de mot", () => {
		expect(scanTrie("une armee allmande", trieOf("llm"))).toEqual([]);
	});

	it("retient la correspondance la plus longue", () => {
		// L'apostrophe est traitée comme un caractère de mot, donc on isole
		// l'expression pour tester la correspondance la plus longue sans ambiguïté.
		const matches = scanTrie(
			"une intelligence artificielle avance",
			trieOf("intelligence", "intelligence artificielle"),
		);
		expect(matches).toEqual([
			{ start: 4, end: 29, value: "intelligence artificielle" },
		]);
	});

	it("ne renvoie pas de correspondances qui se chevauchent", () => {
		const matches = scanTrie("rag rag rag", trieOf("rag"));
		expect(matches.map((m) => m.start)).toEqual([0, 4, 8]);
	});

	it("accepte une correspondance en début et en fin de texte", () => {
		expect(scanTrie("llm", trieOf("llm"))).toEqual([{ start: 0, end: 3, value: "llm" }]);
	});

	it("traite l'apostrophe et le tiret comme des caractères de mot", () => {
		// « ia » ne doit pas matcher dans « d'ia » traité comme un seul mot.
		expect(scanTrie("porte-parole", trieOf("parole"))).toEqual([]);
	});

	it("trouve plusieurs termes distincts dans l'ordre du texte", () => {
		const matches = scanTrie("le rag et le llm", trieOf("llm", "rag"));
		expect(matches.map((m) => m.value)).toEqual(["rag", "llm"]);
	});

	it("retourne un tableau vide sur un trie vide", () => {
		expect(scanTrie("un llm recent", buildTrie([]))).toEqual([]);
	});
});
