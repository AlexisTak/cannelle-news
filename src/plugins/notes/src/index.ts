import type { PluginDescriptor } from "emdash";

export const CANNELLE_NOTES_ID = "cannelle-notes";

export function cannelleNotesPlugin(): PluginDescriptor {
	return {
		id: CANNELLE_NOTES_ID,
		version: "0.1.0",
		format: "standard",
		entrypoint: "@cannelle/plugin-notes/sandbox",
		options: {},
		capabilities: ["users:read"],
		storage: {
			notes: { indexes: ["status", "pinned", "assigneeId", "updatedAt"] },
		},
		adminPages: [{ path: "/notes", label: "Cannelle Notes", icon: "clipboard-list" }],
	};
}
