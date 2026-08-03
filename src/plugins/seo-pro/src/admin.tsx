import { DashboardPage } from "./ui/pages/DashboardPage";
import { EntryReportPage } from "./ui/pages/EntryReportPage";
import { SettingsPage } from "./ui/pages/SettingsPage";
import { SeoOverviewWidget } from "./ui/widgets/SeoOverviewWidget";

/**
 * Exports admin du plugin.
 *
 * EmDash attend la forme `PluginAdminModule` : `{ pages?, widgets?, fields? }`,
 * chacun un `Record<string, ComponentType>` — des composants **sans props**
 * (`@emdash-cms/admin/dist/index.d.ts:74`). Les paramètres d'URL passent donc
 * par `useParams()`, jamais par les props.
 *
 * Les clés sont résolues par **égalité stricte** — `resolvePluginPagePath` fait
 * `pages[path]`, sans filtrage de motif (`dist/index.js:189`). Un chemin du type
 * `/entry/:collection/:id` ne matcherait donc jamais une URL réelle : l'article
 * ciblé passe en query string sur le chemin statique `/entry`.
 */
export const pages = {
	"/dashboard": DashboardPage,
	"/entry": EntryReportPage,
	"/settings": SettingsPage,
};

export const widgets = {
	"seo-overview": SeoOverviewWidget,
};

export default { pages, widgets };
