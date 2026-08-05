import type { PluginDescriptor } from "emdash";

export const CANNELLE_FORMS_ID = "cannelle-forms";
export const CANNELLE_FORMS_VERSION = "0.1.0";

export function cannelleFormsPlugin(): PluginDescriptor {
	return {
		id: CANNELLE_FORMS_ID,
		version: CANNELLE_FORMS_VERSION,
		format: "standard",
		entrypoint: "@cannelle/plugin-forms/sandbox",
		options: {},
		capabilities: ["email:send"],
		storage: {
			forms: { indexes: ["slug", "status", "createdAt", "updatedAt"] },
			formVersions: { indexes: ["formId", "createdAt"] },
			submissions: { indexes: ["formId", "status", "createdAt"] },
			auditLogs: { indexes: ["action", "targetId", "createdAt"] },
			eventOutbox: { indexes: ["name", "status", "createdAt"] },
			notificationJobs: { indexes: ["status", "createdAt", "nextAttemptAt"] },
		},
		adminPages: [{ path: "/forms", label: "Cannelle Forms", icon: "forms" }],
		settingsSchema: {
			notificationRecipient: { type: "string", label: "E-mail de notification", description: "Reçoit une notification après chaque soumission.", default: "" },
			sendReceipt: { type: "boolean", label: "Envoyer un accusé de réception", default: false },
			submissionRateLimit: { type: "number", label: "Soumissions par fenêtre", default: 10, min: 1, max: 1000 },
			submissionRateWindowSeconds: { type: "number", label: "Durée de la fenêtre (secondes)", default: 600, min: 10, max: 86400 },
			retentionDays: { type: "number", label: "Conservation des soumissions (jours)", default: 365, min: 1, max: 3650 },
			retentionMode: { type: "select", label: "Fin de conservation", default: "anonymize", options: [{ label: "Anonymiser", value: "anonymize" }, { label: "Supprimer", value: "delete" }] },
		},
	};
}
