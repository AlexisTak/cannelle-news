import type { PluginDescriptor } from "emdash";

export const CANNELLE_ANALYTICS_ID = "cannelle-analytics";

export function cannelleAnalyticsPlugin(): PluginDescriptor {
	return {
		id: CANNELLE_ANALYTICS_ID,
		version: "0.1.0",
		format: "standard",
		entrypoint: "@cannelle/plugin-analytics/sandbox",
		options: {},
		capabilities: ["hooks.page-fragments:register"],
		storage: {
			events: { indexes: ["date", "type", "path", "visitorId", "createdAt", "source", "device"] },
			goals: { indexes: ["name", "eventType", "createdAt"] },
			goalCompletions: { indexes: ["goalId", "eventId", "visitorId", "date", "createdAt"] },
			auditLogs: { indexes: ["action", "createdAt"] },
		},
		adminPages: [{ path: "/analytics", label: "Cannelle Analytics", icon: "chart" }],
		settingsSchema: {
			enabled: { type: "boolean", label: "Activer la collecte", default: true },
			respectDnt: { type: "boolean", label: "Respecter Do Not Track", default: true },
			retentionDays: { type: "number", label: "Conservation des événements (jours)", default: 365, min: 1, max: 3650 },
			excludeAdmins: { type: "boolean", label: "Exclure les administrateurs", default: true },
		},
	};
}
