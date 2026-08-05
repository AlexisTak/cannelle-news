import { hrefToPath, isInternalHref } from "../content/link-classifier";
import { collectLinkHrefs } from "../content/spans";
import type { IndexedKeyword } from "../domain/keyword-entry";

/**
 * Construit un index `href` → `targetId` à partir des mots-clés indexés.
 *
 * Le corps stocke les liens sous forme de chemin relatif (`/posts/llm`) ou
 * absolue (`https://site/posts/llm`). L'index stocke `targetUrl` sous forme
 * relative. On indexe les deux formes pour ne pas rater une correspondance.
 */
export function buildUrlToTargetMap(keywords: IndexedKeyword[]): Map<string, string> {
	const map = new Map<string, string>();

	for (const keyword of keywords) {
		const targetId = keyword.targetId;
		const url = keyword.targetUrl;
		if (!url) continue;

		map.set(url, targetId);
		map.set(hrefToPath(url), targetId);

		// Certains liens absolus peuvent inclure un trailing slash ou une
		// origine différente ; on garde aussi le slug seul comme fallback.
		const slug = url.split("/").pop();
		if (slug) {
			map.set(`/${slug}`, targetId);
			map.set(slug, targetId);
		}
	}

	return map;
}

/**
 * Extrait les `targetId` pointés par les liens internes d'un article.
 *
 * Seuls les liens reconnus comme internes par `isInternalHref` sont conservés.
 * Un lien qui ne correspond à aucune cible de l'index est ignoré (lien vers
 * une page non analysable, une ancienne URL, etc.).
 */
export function extractInternalLinkTargets(
	body: unknown[],
	siteUrl: string | null,
	urlToTargetMap: Map<string, string>,
	sourceId: string,
): string[] {
	const targets: string[] = [];

	for (const href of collectLinkHrefs(body)) {
		if (!isInternalHref(href, siteUrl)) continue;

		const path = hrefToPath(href);
		const targetId = urlToTargetMap.get(path);
		if (targetId && targetId !== sourceId) targets.push(targetId);
	}

	return targets;
}
