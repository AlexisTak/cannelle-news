import { describe, expect, it } from "vitest";
import { CANNELLE_NOTES_ID, cannelleNotesPlugin } from "./index";

describe("cannelleNotesPlugin", () => {
	it("déclare l'id, le format et l'entrypoint attendus", () => {
		const plugin = cannelleNotesPlugin();
		expect(plugin.id).toBe(CANNELLE_NOTES_ID);
		expect(plugin.id).toBe("cannelle-notes");
		expect(plugin.format).toBe("standard");
		expect(plugin.entrypoint).toBe("@cannelle/plugin-notes/sandbox");
	});

	it("ne déclare que la capacité users:read", () => {
		expect(cannelleNotesPlugin().capabilities).toEqual(["users:read"]);
	});

	it("déclare la collection de stockage notes", () => {
		expect(Object.keys(cannelleNotesPlugin().storage ?? {})).toEqual(["notes"]);
	});

	it("déclare une seule page admin à /notes", () => {
		expect(cannelleNotesPlugin().adminPages).toEqual([{ path: "/notes", label: "Cannelle Notes", icon: "clipboard-list" }]);
	});
});
