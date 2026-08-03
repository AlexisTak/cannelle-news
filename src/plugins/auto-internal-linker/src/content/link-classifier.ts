/**
 * Un lien pointe-t-il vers ce site ?
 *
 * Sans `siteUrl` configuré, une URL absolue est comptée externe : mieux vaut
 * sous-estimer le maillage existant que le gonfler avec des liens sortants,
 * car ce décompte sert de plancher au plafond de liens de l'article.
 */
export function isInternalHref(href: string, siteUrl: string | null): boolean {
	if (!href) return false;
	if (href.startsWith("#")) return false;
	if (href.startsWith("//")) return false;
	if (href.startsWith("/")) return true;
	if (!siteUrl) return false;

	try {
		return new URL(href).hostname === new URL(siteUrl).hostname;
	} catch {
		return false;
	}
}

/**
 * Réduit un href interne à son chemin, pour le comparer à un `targetUrl`.
 *
 * L'index stocke des chemins relatifs (`/posts/llm`) tandis que le corps peut
 * contenir la forme absolue (`https://cannelle.news/posts/llm`). Sans cette
 * réduction, la règle d'unicité par cible ne verrait pas un lien déjà posé
 * sous sa forme absolue, et proposerait un doublon.
 */
export function hrefToPath(href: string): string {
	if (href.startsWith("/")) return href.split(/[?#]/)[0];
	try {
		return new URL(href).pathname;
	} catch {
		return href;
	}
}
