import { normalizeKeyword } from "../matching/normalize";
import { STOPWORDS } from "./stopwords";

/**
 * Formes indexables d'un titre.
 *
 * Deux formes plutôt qu'une : le titre entier attrape les citations littérales,
 * sa réduction attrape le sujet. « Qu'est-ce qu'un LLM ? » indexe ainsi « llm »,
 * qui est le seul terme qu'un autre article emploiera réellement.
 *
 * Le titre entier passe en premier : à poids égal, la forme la plus longue est
 * aussi la plus spécifique, et le trie privilégie de toute façon la
 * correspondance la plus longue au moment du balayage.
 */
export function titleVariants(title: string): string[] {
	const full = normalizeKeyword(title);
	if (!full) return [];

	// On tokenise sur espaces, apostrophes et tirets : « qu'est-ce qu'un LLM ? »
	// devient ["qu", "est", "ce", "qu", "un", "llm"], dont seul « llm »
	// survive le filtre. C'est le noyau du sujet, celui qu'un autre article
	// emploiera réellement.
	const tokens = full.split(/[\s'-]+/).filter(Boolean);
	const meaningful = tokens.filter(
		(token) => token.length >= 3 && !STOPWORDS.has(token),
	);
	const reduced = meaningful.join(" ");

	// Le titre entier n'est gardé que s'il contient au moins un mot signifiant :
	// un titre entièrement fait de mots vides ne produit aucune variante.
	const variants = meaningful.length > 0 ? [full, reduced] : [];
	return [...new Set(variants.filter(Boolean))];
}
