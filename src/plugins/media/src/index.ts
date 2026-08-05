import type { PluginDescriptor } from "emdash";

export const CANNELLE_MEDIA_ID = "cannelle-media";
export function cannelleMediaPlugin(): PluginDescriptor {
	return { id: CANNELLE_MEDIA_ID, version: "0.1.0", format: "standard", entrypoint: "@cannelle/plugin-media/sandbox", options: {},
		capabilities: ["media:read", "media:write", "network:request:unrestricted"],
		storage: { assets: { indexes: ["mediaId", "mimeType", "status", "updatedAt"] }, versions: { indexes: ["mediaId", "version", "createdAt"] }, jobs: { indexes: ["mediaId", "type", "status", "createdAt"] }, auditLogs: { indexes: ["action", "createdAt"] } },
		adminPages: [{ path: "/media", label: "Cannelle Media", icon: "image" }],
		settingsSchema: {
			maxUploadMb: { type: "number", label: "Taille maximale (Mo)", default: 25, min: 1, max: 500 },
			allowedMimePrefixes: { type: "string", label: "Types MIME autorisés", default: "image/,application/pdf,video/,audio/" },
			autoAlt: { type: "boolean", label: "Générer un ALT à l’import", default: true }, autoOcr: { type: "boolean", label: "Programmer l’OCR", default: false },
			processorEndpoint: { type: "string", label: "Endpoint du processeur", default: "" }, processorSecret: { type: "secret", label: "Secret du processeur" }, cdnBaseUrl: { type: "string", label: "Base CDN", default: "" },
		},
	};
}
