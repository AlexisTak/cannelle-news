import type { ContentBylineCredit } from "emdash";
import { describe, expect, it } from "vitest";
import {
	formatArticleDate,
	formatByline,
	formatPostCount,
	resolveKicker,
} from "../format";

describe("formatArticleDate", () => {
	it("formate en français long", () => {
		expect(formatArticleDate(new Date("2026-08-04T10:00:00Z"))).toBe("4 août 2026");
	});

	it("ne préfixe pas le jour d'un zéro", () => {
		expect(formatArticleDate(new Date("2026-01-09T10:00:00Z"))).toBe("9 janvier 2026");
	});
});

describe("formatByline", () => {
	const credit = (displayName: string, sortOrder: number): ContentBylineCredit =>
		({
			byline: { displayName, slug: displayName.toLowerCase() },
			sortOrder,
			roleLabel: null,
		}) as ContentBylineCredit;

	it("retourne null sans signature", () => {
		expect(formatByline(undefined)).toBeNull();
		expect(formatByline([])).toBeNull();
	});

	it("préfixe une signature unique", () => {
		expect(formatByline([credit("Alexis Tak", 0)])).toBe("Par Alexis Tak");
	});

	it("joint deux signatures par « et »", () => {
		expect(formatByline([credit("Alexis Tak", 0), credit("Chloé Michon", 1)])).toBe(
			"Par Alexis Tak et Chloé Michon",
		);
	});

	it("joint trois signatures par virgules puis « et »", () => {
		expect(
			formatByline([
				credit("Alexis Tak", 0),
				credit("Chloé Michon", 1),
				credit("Jean Dupont", 2),
			]),
		).toBe("Par Alexis Tak, Chloé Michon et Jean Dupont");
	});

	it("respecte sortOrder plutôt que l'ordre du tableau", () => {
		expect(formatByline([credit("Chloé Michon", 1), credit("Alexis Tak", 0)])).toBe(
			"Par Alexis Tak et Chloé Michon",
		);
	});
});

describe("resolveKicker", () => {
	it("préfère le champ kicker quand il est renseigné", () => {
		expect(
			resolveKicker({
				kicker: "Enquête",
				categories: [{ label: "Science", slug: "science" }],
			}),
		).toEqual({ label: "Enquête" });
	});

	it("retombe sur la première catégorie et fournit son lien", () => {
		expect(
			resolveKicker({ categories: [{ label: "Science", slug: "science" }] }),
		).toEqual({ label: "Science", href: "/category/science" });
	});

	it("ignore un kicker vide ou fait d'espaces", () => {
		expect(
			resolveKicker({
				kicker: "   ",
				categories: [{ label: "Science", slug: "science" }],
			}),
		).toEqual({ label: "Science", href: "/category/science" });
	});

	it("ignore un kicker qui n'est pas une chaîne", () => {
		expect(resolveKicker({ kicker: 42, categories: [] })).toBeNull();
	});

	it("retourne null sans kicker ni catégorie", () => {
		expect(resolveKicker({})).toBeNull();
	});
});

describe("formatPostCount", () => {
	it("accorde le singulier", () => {
		expect(formatPostCount(1)).toBe("1 article");
	});

	it("accorde le pluriel", () => {
		expect(formatPostCount(4)).toBe("4 articles");
	});

	it("traite zéro comme un pluriel", () => {
		expect(formatPostCount(0)).toBe("0 article");
	});
});
