/**
 * Un lien est-il interne ?
 *
 * Sans `siteUrl` configuré, une URL absolue est comptée externe : mieux vaut
 * sous-estimer le maillage interne que le gonfler avec des liens sortants.
 */
export function classifyLink(href: string, siteUrl: string | undefined): boolean {
	if (!href) return false;
	if (href.startsWith("/") || href.startsWith("#")) return true;
	if (!siteUrl) return false;
	try {
		const linkHost = new URL(href).hostname;
		const siteHost = new URL(siteUrl).hostname;
		return linkHost === siteHost;
	} catch {
		return false;
	}
}
