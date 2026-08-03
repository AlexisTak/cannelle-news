/**
 * Table d'accents reprise de `seo-pro/src/analysis/keywords/normalize.ts`.
 *
 * Recopiée plutôt qu'importée : les deux plugins sont indépendants, un import
 * croisé créerait un couplage que ni l'un ni l'autre ne veut.
 */
const ACCENTS: Record<string, string> = {
	à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", æ: "ae",
	ç: "c",
	è: "e", é: "e", ê: "e", ë: "e",
	ì: "i", í: "i", î: "i", ï: "i",
	ñ: "n",
	ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", œ: "oe",
	ù: "u", ú: "u", û: "u", ü: "u",
	ÿ: "y",
};

export interface NormalizedText {
	normalized: string;
	/** `map[i]` = offset **brut** du i-ème caractère normalisé. */
	map: number[];
}

/**
 * Projette un texte sur sa forme comparable en gardant le chemin du retour.
 *
 * Sans la carte d'offsets, une correspondance trouvée dans le texte normalisé
 * serait inutilisable : découper un span exige des positions dans le texte
 * d'origine. Les ligatures (`œ` → `oe`, `æ` → `ae`) produisent deux caractères
 * normalisés pour un seul caractère brut ; les deux entrées de la carte
 * renvoient alors au même offset, ce qui est exactement ce qu'on veut pour
 * reconstituer la sous-chaîne brute par `raw.slice(map[start], map[end])`.
 *
 * La carte contient une entrée de plus que le texte normalisé : la sentinelle
 * finale vaut `raw.length`, pour qu'une correspondance se terminant en fin de
 * texte reste tranchable.
 */
export function normalizeWithOffsets(raw: string): NormalizedText {
	let normalized = "";
	const map: number[] = [];

	for (let i = 0; i < raw.length; i++) {
		const lower = raw[i].toLowerCase();
		const replacement = ACCENTS[lower] ?? lower;
		for (const ch of replacement) {
			normalized += ch;
			map.push(i);
		}
	}
	map.push(raw.length);

	return { normalized, map };
}

/**
 * Forme comparable d'un mot-clé d'index.
 *
 * Les espaces internes sont compressés parce qu'un mot-clé saisi à la main
 * arrive souvent avec un espace de trop, et qu'une expression de deux mots
 * doit s'aligner sur le texte du corps, où l'espace est unique.
 */
export function normalizeKeyword(raw: string): string {
	const { normalized } = normalizeWithOffsets(raw);
	return normalized.trim().replace(/\s+/g, " ");
}

/**
 * Un caractère fait-il partie d'un mot ?
 *
 * Apostrophes et tirets en font partie : « aujourd'hui » et « porte-parole »
 * sont des unités lexicales, et les couper produirait des correspondances sur
 * des fragments. `undefined` — au-delà des bornes de la chaîne — compte comme
 * une frontière, ce qui rend une correspondance en début ou fin de texte
 * valide sans traitement particulier.
 */
export function isWordChar(ch: string | undefined): boolean {
	if (ch === undefined) return false;
	return /[a-z0-9'-]/.test(ch);
}
