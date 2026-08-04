/**
 * Lecture des sorties de modèle.
 *
 * Le prompt exige du JSON, mais un modèle local 8B répond régulièrement par
 * une liste à puces, du JSON entouré d'une clôture ```json, ou du JSON précédé
 * d'une phrase d'introduction. Trois stratégies successives valent mieux qu'un
 * `JSON.parse` qui remonte une erreur au rédacteur pour une réponse qui était
 * en réalité parfaitement exploitable.
 */

/** Retire une clôture Markdown ```…``` si la réponse en est entourée. */
export function stripCodeFence(raw: string): string {
	const trimmed = raw.trim();
	const match = /^```(?:json|javascript|js)?\s*\n([\s\S]*?)\n?```$/i.exec(trimmed);
	return match ? match[1].trim() : trimmed;
}

/**
 * Isole le premier littéral JSON complet de la réponse.
 *
 * Balayage avec compteur de profondeur plutôt que regex : un titre contenant
 * « [sic] » ou une accolade casserait un `indexOf`/`lastIndexOf` naïf. Les
 * chaînes et leurs échappements sont traversés sans être comptés.
 */
export function extractJson(raw: string): unknown {
	const text = stripCodeFence(raw);

	for (let start = 0; start < text.length; start++) {
		const opener = text[start];
		if (opener !== "[" && opener !== "{") continue;

		const closer = opener === "[" ? "]" : "}";
		let depth = 0;
		let inString = false;
		let escaped = false;

		for (let i = start; i < text.length; i++) {
			const char = text[i];

			if (inString) {
				if (escaped) escaped = false;
				else if (char === "\\") escaped = true;
				else if (char === '"') inString = false;
				continue;
			}

			if (char === '"') inString = true;
			else if (char === opener) depth++;
			else if (char === closer) {
				depth--;
				if (depth === 0) {
					try {
						return JSON.parse(text.slice(start, i + 1));
					} catch {
						break; // littéral mal formé : on tente le suivant
					}
				}
			}
		}
	}

	return null;
}

/**
 * Liste de chaînes, quelle que soit la forme rendue par le modèle.
 *
 * Quatre formes acceptées, dans cet ordre :
 *
 * 1. tableau JSON — la forme demandée ;
 * 2. objet enveloppant un tableau (`{ "titles": [...] }`) ;
 * 3. objet dont les valeurs *sont* les entrées (`{ "point_1": "…",
 *    "point_2": "…" }`) — forme produite spontanément par `qwen3.5:4b` en
 *    mode `format: "json"`, constatée en test réel ;
 * 4. lignes du texte brut débarrassées de leur puce ou numérotation.
 *
 * L'ordre des clés d'un objet JSON parsé suit celui du document source pour
 * les clés non numériques, ce sur quoi le point 3 s'appuie.
 */
export function parseStringList(raw: string): string[] {
	const json = extractJson(raw);

	if (Array.isArray(json)) return cleanList(json.map(toText));

	if (json && typeof json === "object") {
		const values = Object.values(json as Record<string, unknown>);

		for (const value of values) {
			if (Array.isArray(value)) return cleanList(value.map(toText));
		}

		const strings = values.filter((value): value is string => typeof value === "string");
		if (strings.length > 0) return cleanList(strings);
	}

	return cleanList(stripCodeFence(raw).split("\n").map(stripListMarker));
}

/**
 * Champ texte unique (`description`, `text`).
 *
 * `key` est cherchée d'abord, puis n'importe quelle valeur chaîne de l'objet :
 * un modèle qui répond `{ "meta_description": "..." }` a fait le travail, la
 * clé exacte n'est qu'un détail de forme.
 */
export function parseTextField(raw: string, key: string): string {
	const json = extractJson(raw);

	if (typeof json === "string") return json.trim();

	if (json && typeof json === "object" && !Array.isArray(json)) {
		const record = json as Record<string, unknown>;
		if (typeof record[key] === "string") return (record[key] as string).trim();
		for (const value of Object.values(record)) {
			if (typeof value === "string" && value.trim()) return value.trim();
		}
	}

	// Le modèle a répondu en texte libre : on prend tout, guillemets en moins.
	return stripSurroundingQuotes(stripCodeFence(raw));
}

function toText(value: unknown): string {
	if (typeof value === "string") return value;
	// Certains modèles rendent `[{ "title": "..." }]` au lieu de `["..."]`.
	if (value && typeof value === "object") {
		for (const inner of Object.values(value as Record<string, unknown>)) {
			if (typeof inner === "string") return inner;
		}
	}
	return "";
}

function cleanList(items: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const item of items) {
		const text = stripSurroundingQuotes(item).trim();
		if (!text) continue;
		const key = text.toLocaleLowerCase("fr");
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(text);
	}

	return result;
}

/** `- Titre`, `* Titre`, `1. Titre`, `1) Titre` → `Titre`. */
function stripListMarker(line: string): string {
	return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function stripSurroundingQuotes(text: string): string {
	const trimmed = text.trim();
	const match = /^["'«»“”](.*)["'«»“”]$/s.exec(trimmed);
	return (match ? match[1] : trimmed).trim();
}
