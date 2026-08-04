import { GlossaryManagerPage } from "./admin/GlossaryManagerPage";
import { GlossaryMarkButton } from "./admin/GlossaryMarkButton";

/**
 * Point d'entrée admin du plugin.
 *
 * - pages : module de gestion du glossaire.
 * - fields : widget pour taguer un terme dans un champ JSON (stockage des
 *   préférences de l'éditeur ou champ dédié) ; non obligatoire pour la mark.
 */
export const pages = {
	"/glossary": GlossaryManagerPage,
};

export const fields = {
	"glossary-term": GlossaryMarkButton,
};

export default { pages, fields };
