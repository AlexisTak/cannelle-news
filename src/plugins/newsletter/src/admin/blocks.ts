import { blocks, elements, type BlockResponse } from "@emdash-cms/blocks/server";
import type { Campaign } from "../domain/types";

export function newsletterDashboard(counts: { confirmed: number; pending: number; unsubscribed: number }, campaigns: Campaign[]): BlockResponse {
	const content = [
		blocks.header("Cannelle Newsletter"), blocks.section("Abonnés, consentements et campagnes dans EmDash."),
		blocks.stats([{ label: "Confirmés", value: counts.confirmed }, { label: "En attente", value: counts.pending }, { label: "Désinscrits", value: counts.unsubscribed }, { label: "Campagnes", value: campaigns.length }]),
		blocks.header("Campagnes récentes"), blocks.table({ columns: [{ key: "name", label: "Campagne" }, { key: "subject", label: "Objet" }, { key: "status", label: "Statut", format: "badge" }, { key: "createdAt", label: "Création", format: "relative_time" }], rows: campaigns.map((item) => ({ name: item.name, subject: item.subject, status: item.status, createdAt: item.createdAt })), pageActionId: "noop", emptyText: "Aucune campagne" }),
		blocks.form({ blockId: "campaign", fields: [elements.textInput("name", "Nom"), elements.textInput("subject", "Objet"), elements.textInput("text", "Contenu texte", { multiline: true }), elements.textInput("listId", "Liste", { initialValue: "main" })], submit: { label: "Créer le brouillon", actionId: "create_campaign" } }),
	];
	if (campaigns.some((campaign) => campaign.status === "draft")) content.push(blocks.form({ blockId: "schedule", fields: [
		elements.select("id", "Campagne", campaigns.filter((campaign) => campaign.status === "draft").map((campaign) => ({ label: campaign.name, value: campaign.id }))),
		elements.dateInput("scheduledAt", "Date d'envoi"),
	], submit: { label: "Programmer", actionId: "schedule_campaign" } }));
	return { blocks: content };
}
