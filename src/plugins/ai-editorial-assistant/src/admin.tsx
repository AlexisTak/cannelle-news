import { AssistantPanelField } from "./ui/fields/AssistantPanelField";
import { TldrField } from "./ui/fields/TldrField";
import { PromptsPage } from "./ui/pages/PromptsPage";
import { MissingMetaWidget } from "./ui/widgets/MissingMetaWidget";

/**
 * Exports admin du plugin.
 *
 * EmDash attend la forme `PluginAdminModule` : `{ pages?, widgets?, fields? }`,
 * chacun un `Record<string, ComponentType>` de composants **sans props**
 * (`@emdash-cms/admin/dist/index.d.ts:74`).
 *
 * Les clés de `fields` sont les noms de widgets **sans le préfixe du plugin** :
 * `FieldRenderer` découpe `field.widget` sur le premier `:` et résout
 * `pluginAdmins[pluginId].fields[widgetName]` (`dist/index.js:14459-14462`).
 * Un champ déclaré `"widget": "ai-editorial-assistant:tldr"` dans le schéma
 * atterrit donc sur la clé `tldr` ci-dessous.
 *
 * Les chemins de `pages` sont résolus par égalité stricte, sans motif : ils
 * doivent correspondre exactement aux `path` déclarés dans `admin.pages`.
 */
export const pages = {
	"/prompts": PromptsPage,
};

export const fields = {
	panel: AssistantPanelField,
	tldr: TldrField,
};

export const widgets = {
	"missing-meta": MissingMetaWidget,
};

export default { pages, fields, widgets };
