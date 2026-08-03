import { stopwordsFr } from "../keywords/stopwords.fr";
import { stopwordsEn } from "../keywords/stopwords.en";

/**
 * Extrait les mots en gardant lettres accentuées et apostrophes internes.
 *
 * Un simple `split(/\s+/)` laisserait la ponctuation collée (« de, », « the. »)
 * et aucun de ces tokens ne matcherait les listes de mots vides : les deux
 * compteurs tomberaient à presque zéro et la détection deviendrait un tirage.
 */
const WORD_PATTERN = /\p{L}[\p{L}'’-]*/gu;

function words(text: string): string[] {
	const matched = text.toLowerCase().match(WORD_PATTERN);
	// Apostrophe typographique ramenée à l'apostrophe droite des listes.
	return matched ? matched.map((w) => w.replace(/’/g, "'")) : [];
}

/**
 * Le français gagne les égalités : le site est francophone, et un faux positif
 * anglais appliquerait Flesch (84.6 syllabes/mot) à du texte français, dont les
 * mots sont plus longs — le score s'effondrerait à tort.
 */
export function detectLanguage(text: string): "fr" | "en" {
	const tokens = words(text);
	const fr = tokens.filter((w) => stopwordsFr.has(w)).length;
	const en = tokens.filter((w) => stopwordsEn.has(w)).length;
	return en > fr ? "en" : "fr";
}
