import type { IndexedKeyword } from "../keyword-entry";

/**
 * Départage deux articles qui réclament le même mot-clé.
 *
 * Retourne un nombre négatif si `a` doit l'emporter, positif si c'est `b`.
 *
 * Trois critères, dans cet ordre :
 *
 * 1. **Le poids de la source.** Un mot-clé saisi à la main l'emporte sur un
 *    titre, qui l'emporte sur un tag partagé, qui l'emporte sur une extraction
 *    statistique. C'est l'ordre de l'intention éditoriale.
 * 2. **La fraîcheur.** À poids égal, l'article indexé le plus récemment gagne :
 *    sur un site d'actualité, le dernier papier sur un sujet est en général
 *    celui vers lequel on veut envoyer le lecteur.
 * 3. **L'identifiant.** Aucun sens éditorial : ce critère n'existe que pour
 *    qu'une égalité parfaite ne dépende pas de l'ordre de retour du stockage.
 *    Sans lui, deux exécutions sur les mêmes données pourraient différer.
 */
export function compareCandidates(a: IndexedKeyword, b: IndexedKeyword): number {
	if (a.weight !== b.weight) return b.weight - a.weight;
	if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
	return a.targetId < b.targetId ? -1 : 1;
}

/**
 * Un gagnant par forme normalisée.
 *
 * Nécessaire avant la construction du trie, qui n'associe qu'une valeur par
 * clé : sans arbitrage préalable, le dernier mot-clé inséré écraserait
 * silencieusement les autres, et la cible d'un lien dépendrait de l'ordre de
 * lecture du stockage.
 */
export function pickWinners(keywords: IndexedKeyword[]): IndexedKeyword[] {
	const best = new Map<string, IndexedKeyword>();

	for (const keyword of keywords) {
		const current = best.get(keyword.normalized);
		if (!current || compareCandidates(keyword, current) < 0) {
			best.set(keyword.normalized, keyword);
		}
	}

	return [...best.values()];
}
