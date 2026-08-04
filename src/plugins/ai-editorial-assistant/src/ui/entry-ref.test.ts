import { describe, expect, it } from "vitest";
import { readEntryRef } from "./entry-ref";

describe("readEntryRef", () => {
	it("reads the collection and id from the editor path", () => {
		expect(readEntryRef("/_emdash/admin/content/posts/01JDX0000")).toEqual({
			collection: "posts",
			id: "01JDX0000",
		});
	});

	it("ignores a trailing query string", () => {
		expect(readEntryRef("/_emdash/admin/content/posts/01JDX0000?locale=fr")).toEqual({
			collection: "posts",
			id: "01JDX0000",
		});
	});

	it("returns null on a new entry", () => {
		// Rien à lire côté serveur tant que l'entrée n'a jamais été enregistrée.
		expect(readEntryRef("/_emdash/admin/content/posts/new")).toBeNull();
	});

	it("returns null outside the content editor", () => {
		expect(readEntryRef("/_emdash/admin/media")).toBeNull();
		expect(readEntryRef("")).toBeNull();
	});

	it("decodes an escaped collection name", () => {
		expect(readEntryRef("/_emdash/admin/content/blog%20posts/42")?.collection).toBe(
			"blog posts",
		);
	});
});
