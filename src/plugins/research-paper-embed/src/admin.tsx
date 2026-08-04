import { RefreshButton } from "./admin/RefreshButton";

/**
 * Exports admin du plugin.
 *
 * `RefreshButton` est rendu disponible comme widget de champ sous le nom
 * `research-paper-embed:refresh`. Il peut être rattaché à un champ JSON/string
 * dans un schéma de type de contenu pour permettre de re-fetcher les
 * métadonnées d'un papier déjà saisi.
 */
export const fields = {
  refresh: RefreshButton,
};

export default { fields };
