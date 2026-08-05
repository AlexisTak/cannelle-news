export interface AdminTool {
	id: string;
	name: string;
	description: string;
	page: string;
	settings?: string;
}

export interface AdminCategory {
	id: "editorial" | "audience" | "revenue" | "quality";
	name: string;
	description: string;
	tools: AdminTool[];
}

const ADMIN_BASE = "/_emdash/admin";
const pluginPage = (id: string, path: string) => `${ADMIN_BASE}/plugins/${id}${path}`;
const settingsPage = (id: string) => `${ADMIN_BASE}/plugins-manager/${id}/settings`;

export const ADMIN_CATEGORIES: AdminCategory[] = [
	{
		id: "editorial",
		name: "Contenu éditorial",
		description: "Produire, enrichir et structurer les publications.",
		tools: [
			{ id: "media", name: "Media", description: "DAM, ALT, OCR, versions et CDN.", page: pluginPage("cannelle-media", "/media"), settings: settingsPage("cannelle-media") },
			{ id: "fact-check", name: "Fact Check", description: "Affirmations, sources et validation humaine.", page: pluginPage("cannelle-fact-check", "/fact-check"), settings: settingsPage("cannelle-fact-check") },
			{ id: "ai", name: "Assistant IA", description: "Aide à la rédaction et métadonnées.", page: pluginPage("ai-editorial-assistant", "/prompts"), settings: settingsPage("ai-editorial-assistant") },
			{ id: "glossary", name: "Glossaire", description: "Termes, définitions et cartes contextuelles.", page: pluginPage("glossary-cards", "/glossary") },
		],
	},
	{
		id: "audience",
		name: "Audience & acquisition",
		description: "Collecter, convertir et fidéliser l’audience.",
		tools: [
			{ id: "analytics", name: "Analytics", description: "Mesure respectueuse de la vie privée et objectifs.", page: pluginPage("cannelle-analytics", "/analytics"), settings: settingsPage("cannelle-analytics") },
			{ id: "forms", name: "Forms", description: "Formulaires, soumissions et notifications.", page: pluginPage("cannelle-forms", "/forms"), settings: settingsPage("cannelle-forms") },
			{ id: "newsletter", name: "Newsletter", description: "Abonnés, campagnes et délivrabilité.", page: pluginPage("cannelle-newsletter", "/newsletter"), settings: settingsPage("cannelle-newsletter") },
		],
	},
	{
		id: "revenue",
		name: "Monétisation",
		description: "Piloter les offres et les revenus lecteurs.",
		tools: [
			{ id: "paywall", name: "Paywall", description: "Offres, abonnements, coupons et facturation.", page: pluginPage("cannelle-paywall", "/paywall"), settings: settingsPage("cannelle-paywall") },
		],
	},
	{
		id: "quality",
		name: "Qualité & visibilité",
		description: "Améliorer le référencement, le maillage et l’intégrité.",
		tools: [
			{ id: "seo", name: "SEO Pro", description: "Audits SEO et génération de métadonnées.", page: pluginPage("seo-pro", "/dashboard"), settings: pluginPage("seo-pro", "/settings") },
			{ id: "links", name: "Maillage interne", description: "Suggestions, reconstruction et audit des liens.", page: pluginPage("auto-internal-linker", "/audit"), settings: pluginPage("auto-internal-linker", "/settings") },
			{ id: "integrity", name: "Intégrité du contenu", description: "Détection de similarités et contrôle éditorial.", page: pluginPage("content-integrity", "/integrity") },
		],
	},
];
