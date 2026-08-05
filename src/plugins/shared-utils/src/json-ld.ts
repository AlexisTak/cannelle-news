/**
 * Sérialise une valeur JSON-LD de façon sûre pour injection via `set:html`.
 *
 * `JSON.stringify()` n'échappe pas le caractère `<`, ce qui permettrait à une
 * chaîne malveillante de fermer la balise `<script>` et d'injecter du HTML.
 * On neutralise ce vecteur en remplaçant `<` par son escape Unicode.
 */
export function toSafeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}
