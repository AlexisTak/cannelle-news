import type { PluginDescriptor } from "emdash";

export function cannelleNewsletterPlugin(): PluginDescriptor {
	return {
		id: "cannelle-newsletter", version: "0.1.0", format: "standard",
		entrypoint: "@cannelle/plugin-newsletter/sandbox", options: {}, capabilities: ["email:send"],
		storage: {
			subscribers: { indexes: ["emailHash", "status", "listId", "confirmTokenHash", "unsubscribeTokenHash", "createdAt"] },
			lists: { indexes: ["name", "createdAt"] }, campaigns: { indexes: ["status", "listId", "scheduledAt", "createdAt"] },
			deliveries: { indexes: ["campaignId", "subscriberId", "status", "trackingTokenHash", "createdAt"] },
			consents: { indexes: ["subscriberId", "type", "createdAt"] },
			templates: { indexes: ["name", "createdAt"] }, suppressions: { indexes: ["emailHash", "reason", "createdAt"] },
		},
		adminPages: [{ path: "/newsletter", label: "Cannelle Newsletter", icon: "mail" }],
		settingsSchema: {
			fromName: { type: "string", label: "Nom d'expéditeur", default: "Cannelle" },
			doubleOptIn: { type: "boolean", label: "Double opt-in", default: true },
			confirmationSubject: { type: "string", label: "Objet de confirmation", default: "Confirmez votre inscription" },
			eventWebhookSecret: { type: "secret", label: "Secret du webhook de délivrabilité", description: "À transmettre dans l'en-tête X-Cannelle-Signature." },
		},
	};
}
