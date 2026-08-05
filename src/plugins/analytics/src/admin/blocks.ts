import { blocks, elements, type BlockResponse } from "@emdash-cms/blocks/server";
import type { Overview } from "../domain/overview";

export function analyticsDashboard(overview: Overview, days: number, truncated: boolean): BlockResponse {
	return { blocks: [
		blocks.header("Cannelle Analytics"),
		blocks.section(`Audience des ${days} derniers jours — collecte sans cookie.`),
		...(truncated ? [blocks.banner({ title: "Volume partiellement affiché", description: "Le calcul interactif est limité aux 5 000 événements les plus récents.", variant: "alert" })] : []),
		blocks.stats([
			{ label: "Pages vues", value: overview.pageviews }, { label: "Visiteurs", value: overview.visitors },
			{ label: "Événements", value: overview.events }, { label: "Conversions", value: overview.conversions },
		]),
		blocks.header("Pages populaires"),
		blocks.table({ columns: [{ key: "path", label: "Page", format: "code" }, { key: "views", label: "Vues", format: "number" }], rows: overview.topPages, pageActionId: "noop", emptyText: "Aucune page vue" }),
		blocks.columns([
			[blocks.header("Sources"), blocks.table({ columns: [{ key: "source", label: "Source" }, { key: "visits", label: "Visites", format: "number" }], rows: overview.sources, pageActionId: "noop", emptyText: "Aucune source" })],
			[blocks.header("Appareils"), blocks.table({ columns: [{ key: "device", label: "Appareil" }, { key: "visits", label: "Visites", format: "number" }], rows: overview.devices, pageActionId: "noop", emptyText: "Aucun appareil" })],
		]),
		blocks.form({ blockId: "goal", fields: [
			elements.textInput("name", "Nom de l'objectif", { placeholder: "Demande de contact" }),
			elements.select("eventType", "Événement", [{ label: "Soumission de formulaire", value: "form_submit" }, { label: "Inscription newsletter", value: "newsletter_subscribe" }, { label: "Événement personnalisé", value: "custom" }]),
		], submit: { label: "Créer l'objectif", actionId: "create_goal" } }),
	] };
}
