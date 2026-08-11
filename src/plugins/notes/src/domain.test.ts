import { describe, expect, it } from "vitest";
import { filterByStatus, sortNotes, type Note } from "./domain";

function makeNote(overrides: Partial<Note>): Note {
	return {
		id: "n1",
		title: "Titre",
		body: "Corps",
		authorId: "u1",
		authorName: "Alex",
		assigneeId: null,
		assigneeName: null,
		status: "todo",
		pinned: false,
		createdAt: "2026-08-01T00:00:00.000Z",
		updatedAt: "2026-08-01T00:00:00.000Z",
		...overrides,
	};
}

describe("sortNotes", () => {
	it("place les notes épinglées avant les autres, quelle que soit leur date", () => {
		const recentUnpinned = makeNote({ id: "recent", pinned: false, updatedAt: "2026-08-10T00:00:00.000Z" });
		const oldPinned = makeNote({ id: "old-pinned", pinned: true, updatedAt: "2026-08-01T00:00:00.000Z" });
		expect(sortNotes([recentUnpinned, oldPinned]).map((n) => n.id)).toEqual(["old-pinned", "recent"]);
	});

	it("trie par updatedAt décroissant à égalité d'épinglage", () => {
		const older = makeNote({ id: "older", updatedAt: "2026-08-01T00:00:00.000Z" });
		const newer = makeNote({ id: "newer", updatedAt: "2026-08-05T00:00:00.000Z" });
		expect(sortNotes([older, newer]).map((n) => n.id)).toEqual(["newer", "older"]);
	});

	it("ne mute pas le tableau d'entrée", () => {
		const notes = [makeNote({ id: "a" }), makeNote({ id: "b" })];
		const copy = [...notes];
		sortNotes(notes);
		expect(notes).toEqual(copy);
	});
});

describe("filterByStatus", () => {
	it("ne garde que le statut demandé", () => {
		const todo = makeNote({ id: "todo1", status: "todo" });
		const done = makeNote({ id: "done1", status: "done" });
		expect(filterByStatus([todo, done], "done")).toEqual([done]);
	});

	it("retourne un tableau vide si aucune note ne correspond", () => {
		const todo = makeNote({ id: "todo1", status: "todo" });
		expect(filterByStatus([todo], "done")).toEqual([]);
	});
});
