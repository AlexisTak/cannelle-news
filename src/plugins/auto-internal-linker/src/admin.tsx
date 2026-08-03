import { SettingsPage } from "./ui/pages/SettingsPage";
import { SuggestionsField } from "./ui/fields/SuggestionsField";

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
 * Un champ déclaré `"widget": "auto-internal-linker:suggestions"` dans le
 * schéma atterrit donc sur la clé `suggestions` ci-dessous.
 *
 * Les chemins de `pages` sont résolus par égalité stricte, sans motif : ils
 * doivent correspondre exactement aux `path` déclarés dans `admin.pages`.
 */
export const pages = {
	"/settings": SettingsPage,
};

export const fields = {
	suggestions: SuggestionsField,
};

export default { pages, fields };
