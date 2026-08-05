/**
 * Réduit une URL à une valeur posable dans un attribut `href`.
 *
 * Écrit ici plutôt qu'importé d'`emdash` : ce module est consommé par le
 * bundle admin (React), et importer le paquet serveur pour six lignes y
 * tirerait tout le runtime CMS.
 *
 * Seuls les schémas navigables sont conservés. Tout le reste — `javascript:`,
 * `data:`, `vbscript:` — retombe sur `null`, que l'appelant traite comme
 * « pas de lien » plutôt que comme un lien inerte : un `href="#"` afficherait
 * un lien cliquable qui ne mène nulle part.
 */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

export function safeHref(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	// Chemins relatifs et ancres : pas de schéma, donc rien à valider.
	if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

	try {
		// La base ne sert qu'à rendre `URL` tolérant aux formes relatives déjà
		// écartées ci-dessus ; seul le schéma résolu compte.
		const { protocol } = new URL(trimmed, "https://example.invalid");
		return SAFE_SCHEMES.has(protocol) ? trimmed : null;
	} catch {
		return null;
	}
}
