import {
	META_DESCRIPTION_MAX,
	SEO_TITLE_COUNT,
	TLDR_BULLET_COUNT,
	type ActionId,
	type ActionResult,
} from "./actions";
import { parseStringList, parseTextField } from "./parse";

/**
 * Application des contraintes du cahier des charges.
 *
 * Le prompt *demande* cinq titres et 155 caractères ; ce module les *impose*.
 * La distinction est structurante : un modèle sous-dimensionné ou un
 * fournisseur changé en cours de route ne doit jamais pouvoir faire arriver
 * une meta description de 210 caractères dans le panneau SEO.
 */

export class AssistantOutputError extends Error {
	constructor(message: string) {
		super(`ai-editorial-assistant: ${message}`);
		this.name = "AssistantOutputError";
	}
}

/**
 * Transforme la réponse brute du modèle en résultat typé et conforme.
 *
 * `sourceText` n'est utilisé que par `vulgarize`, pour permettre au widget
 * d'afficher l'avant/après sans redemander le paragraphe au serveur.
 */
export function validateOutput(
	action: ActionId,
	raw: string,
	sourceText = "",
): ActionResult {
	switch (action) {
		case "seoTitles": {
			const titles = takeExactly(parseStringList(raw), SEO_TITLE_COUNT, "titre SEO");
			return { action, titles };
		}

		case "tldr": {
			const bullets = takeExactly(parseStringList(raw), TLDR_BULLET_COUNT, "puce de TL;DR");
			return { action, bullets };
		}

		case "metaDescription": {
			const description = truncateMetaDescription(parseTextField(raw, "description"));
			if (!description) throw new AssistantOutputError("meta description vide");
			return { action, description };
		}

		case "vulgarize": {
			const text = normalizeWhitespace(parseTextField(raw, "text"));
			if (!text) throw new AssistantOutputError("reformulation vide");
			return { action, text, sourceText };
		}
	}
}

/**
 * Coupe une meta description à 155 caractères sans casser de mot.
 *
 * Google tronque visuellement autour de 155–160 caractères ; dépasser ne
 * pénalise pas le classement mais ampute la phrase à l'écran. On coupe donc
 * à la dernière frontière de mot et on marque la coupe par une ellipse, qui
 * est comptée dans le budget. La ponctuation orpheline laissée par la coupe
 * (« … , » ) est retirée : c'est le détail qui trahit une description générée.
 */
export function truncateMetaDescription(text: string): string {
	const clean = normalizeWhitespace(text);
	if (clean.length <= META_DESCRIPTION_MAX) return clean;

	const budget = META_DESCRIPTION_MAX - 1; // place réservée à l'ellipse
	const slice = clean.slice(0, budget);
	const lastSpace = slice.lastIndexOf(" ");
	const cut = lastSpace > budget * 0.6 ? slice.slice(0, lastSpace) : slice;

	return `${cut.replace(/[\s,;:.!?—–-]+$/u, "")}…`;
}

/**
 * Ramène une liste au compte exact attendu.
 *
 * Trop d'entrées : on garde les premières, le modèle classe spontanément par
 * pertinence décroissante. Pas assez : on refuse, parce qu'un TL;DR à deux
 * puces n'est pas un TL;DR — mieux vaut une erreur lisible et un second essai
 * qu'un encadré incomplet publié sans que personne le remarque.
 */
function takeExactly(items: string[], count: number, label: string): string[] {
	if (items.length < count) {
		throw new AssistantOutputError(
			`le modèle a renvoyé ${items.length} ${label}(s) au lieu de ${count}`,
		);
	}
	return items.slice(0, count);
}

function normalizeWhitespace(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		// Les espaces accolés à un retour ligne survivraient à la compression
		// précédente et se retrouveraient en tête de paragraphe.
		.replace(/ ?\n ?/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
