import { describe, expect, it } from "vitest";
import { readEntryRef } from "./entry-ref";

describe("readEntryRef", () => {
	it("lit collection et identifiant depuis l'URL de l'éditeur", () => {
		expect(readEntryRef("/_emdash/admin/content/posts/01JABC")).toEqual({
			collection: "posts",
			id: "01JABC",
		});
	});

	it("retourne null sur une entrée jamais enregistrée", () => {
		// Rien à analyser côté serveur tant que l'article n'existe pas : l'UI
		// doit inviter à enregistrer, pas afficher une erreur de route.
		expect(readEntryRef("/_emdash/admin/content/posts/new")).toBeNull();
	});

	it("retourne null hors de l'éditeur", () => {
		expect(readEntryRef("/_emdash/admin/dashboard")).toBeNull();
	});

	it("ignore la query string", () => {
		expect(readEntryRef("/_emdash/admin/content/posts/01J?tab=seo")).toEqual({
			collection: "posts",
			id: "01J",
		});
	});

	it("ignore le fragment", () => {
		expect(readEntryRef("/_emdash/admin/content/posts/01J#content")).toEqual({
			collection: "posts",
			id: "01J",
		});
	});

	it("décode les segments encodés", () => {
		expect(readEntryRef("/_emdash/admin/content/blog%20posts/01J")).toEqual({
			collection: "blog posts",
			id: "01J",
		});
	});

	it("retourne null sur une chaîne vide", () => {
		expect(readEntryRef("")).toBeNull();
	});
});
