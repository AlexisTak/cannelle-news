const ACCENTS: Record<string, string> = {
	à: "a",
	á: "a",
	â: "a",
	ã: "a",
	ä: "a",
	å: "a",
	æ: "ae",
	ç: "c",
	è: "e",
	é: "e",
	ê: "e",
	ë: "e",
	ì: "i",
	í: "i",
	î: "i",
	ï: "i",
	ñ: "n",
	ò: "o",
	ó: "o",
	ô: "o",
	õ: "o",
	ö: "o",
	œ: "oe",
	ù: "u",
	ú: "u",
	û: "u",
	ü: "u",
	ÿ: "y",
};

/**
 * Réduit un token à sa forme comparable : minuscules, sans accents.
 *
 * Apostrophes et tirets survivent volontairement — « aujourd'hui » et
 * « porte-parole » sont des unités lexicales, les casser produirait des
 * fragments (« aujourd », « hui ») qui pollueraient l'extraction.
 */
export function normalizeToken(token: string): string {
	return token
		.toLowerCase()
		.split("")
		.map((ch) => ACCENTS[ch] ?? ch)
		.join("")
		.replace(/[^a-z0-9'-]/g, "")
		.replace(/^-+|-+$/g, "");
}
