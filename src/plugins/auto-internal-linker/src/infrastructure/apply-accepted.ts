import { applyLinks, type LinkPlacement } from "../content/apply-link";
import { isInternalHref } from "../content/link-classifier";
import { collectLinkHrefs, collectLinkableSpans } from "../content/spans";
import type { LinkerConfig } from "../domain/config";
import { SOURCE_WEIGHTS, type IndexedKeyword } from "../domain/keyword-entry";
import { pickWinners } from "../domain/rules/arbitrate";
import type { AcceptedLink } from "../domain/suggestion";
import { normalizeKeyword } from "../matching/normalize";
import { scanSpans } from "../matching/scan";
import { selectSuggestions } from "../matching/select";
import { buildTrie } from "../matching/trie";
import { toLinkerEntry } from "./content-loader";

/**
 * Ré-ancre puis pose les liens acceptés. Rend le nouveau corps, ou `null` si
 * rien n'a changé.
 *
 * Le corps **courant** est rebalayé plutôt que de faire confiance aux offsets
 * enregistrés avec la suggestion : entre le moment où le rédacteur a coché la
 * case et celui où il enregistre, il a pu réécrire le paragraphe. Une décision
 * dont le terme a disparu tombe en silence — une ancre posée à côté de son
 * contexte serait pire que pas d'ancre.
 *
 * L'index n'est pas consulté : tout ce dont on a besoin tient dans les
 * décisions elles-mêmes. Le hook reste ainsi insensible à un index vide ou
 * périmé, et ne coûte aucune lecture de stockage.
 *
 * L'idempotence tombe d'elle-même : la règle d'unicité par cible voit le lien
 * posé au tour précédent et écarte la décision. Rejouer le hook ne double rien.
 */
export function applyAcceptedLinks(
	content: Record<string, unknown>,
	config: LinkerConfig,
): unknown[] | null {
	const entry = toLinkerEntry(content, "");
	const accepted = entry.fieldValue.accepted;
	if (accepted.length === 0 || entry.body.length === 0) return null;

	const trie = buildTrie(
		pickWinners(accepted.map((link) => toPseudoKeyword(link, entry.id))).map((keyword) => ({
			key: keyword.normalized,
			value: keyword,
		})),
	);

	const occurrences = scanSpans(collectLinkableSpans(entry.body), trie);
	if (occurrences.length === 0) return null;

	const suggestions = selectSuggestions({
		occurrences,
		existingInternalHrefs: collectLinkHrefs(entry.body).filter((href) =>
			isInternalHref(href, config.siteUrl),
		),
		ignored: [],
		maxLinksPerEntry: config.maxLinksPerEntry,
	});
	if (suggestions.length === 0) return null;

	const placements: LinkPlacement[] = suggestions.map((suggestion) => ({
		blockKey: suggestion.blockKey,
		spanIndex: suggestion.spanIndex,
		start: suggestion.start,
		end: suggestion.end,
		href: suggestion.targetUrl,
	}));

	return applyLinks(entry.body, placements);
}

/**
 * Une décision acceptée, habillée en `IndexedKeyword`.
 *
 * Le moteur de correspondance ne connaît que cette forme ; la construire ici
 * évite d'en écrire une seconde variante pour le seul chemin d'écriture.
 * `weight` et `source` sont formels : à ce stade toutes les décisions ont la
 * même autorité, celle du rédacteur qui a coché la case.
 */
function toPseudoKeyword(link: AcceptedLink, selfId: string): IndexedKeyword {
	return {
		normalized: normalizeKeyword(link.keyword),
		display: link.keyword,
		targetId: link.targetId,
		targetCollection: "",
		targetSlug: "",
		targetTitle: link.keyword,
		targetUrl: link.targetUrl,
		source: "manual",
		weight: SOURCE_WEIGHTS.manual,
		updatedAt: selfId,
	};
}
