import type { Paragraph } from "../domain/actions";

/**
 * Portable Text → texte plat et paragraphes adressables.
 *
 * Volontairement une copie locale plutôt qu'un import depuis `seo-pro` : deux
 * plugins ne doivent pas se tenir par un module interne. Les besoins divergent
 * déjà — `seo-pro` veut du texte pour compter des mots, ce plugin veut des
 * paragraphes individuellement sélectionnables.
 */

/** Blocs qui ne portent pas de prose à reformuler. */
const NON_PROSE_TYPES = new Set(["image", "code", "htmlBlock", "researchPaper", "aiTldr"]);

/** En dessous, un « paragraphe » est une légende ou une transition. */
const MIN_PARAGRAPH_CHARS = 60;

export function portableTextToPlainText(blocks: unknown): string {
	if (!Array.isArray(blocks)) return "";
	return blocks.map(blockToText).filter(Boolean).join("\n\n");
}

/**
 * Paragraphes proposés au sélecteur « Vulgariser ».
 *
 * Les intertitres sont écartés (rien à vulgariser dans « Méthodologie ») ainsi
 * que les blocs trop courts. L'`index` renvoyé est celui du **bloc dans le
 * document**, pas le rang dans la liste filtrée : c'est lui qui permettra plus
 * tard de resituer le passage sans réaligner deux numérotations.
 */
export function extractParagraphs(blocks: unknown): Paragraph[] {
	if (!Array.isArray(blocks)) return [];

	const paragraphs: Paragraph[] = [];

	blocks.forEach((block, index) => {
		if (typeof block !== "object" || block === null) return;
		const b = block as Record<string, unknown>;

		if (typeof b._type === "string" && NON_PROSE_TYPES.has(b._type)) return;
		if (headingLevel(b) !== null) return;

		const text = blockToText(block).trim();
		if (text.length < MIN_PARAGRAPH_CHARS) return;

		paragraphs.push({ index, text });
	});

	return paragraphs;
}

export function blockToText(block: unknown): string {
	if (typeof block !== "object" || block === null) return "";
	const b = block as Record<string, unknown>;

	// Une liste porte ses entrées dans `children`, pas des spans de texte.
	if (b._type === "list") {
		const items = Array.isArray(b.children) ? b.children : [];
		return items.map(blockToText).join("\n");
	}

	const children = Array.isArray(b.children) ? b.children : [];
	return children.map(spanToText).join("");
}

export function spanToText(span: unknown): string {
	if (typeof span === "string") return span;
	if (typeof span !== "object" || span === null) return "";
	const s = span as Record<string, unknown>;
	return typeof s.text === "string" ? s.text : "";
}

/**
 * Niveau d'intertitre d'un bloc, ou `null` si ce n'en est pas un.
 *
 * EmDash encode les intertitres comme des blocs ordinaires portant un `style`
 * (`"h2"`, `"h3"`…). La forme `{ _type: "heading", level: 2 }` est aussi
 * acceptée : les convertisseurs d'import la produisent, et l'ignorer ferait
 * apparaître des titres dans la liste des paragraphes à vulgariser.
 */
function headingLevel(b: Record<string, unknown>): number | null {
	if (typeof b.style === "string") {
		const match = /^h([1-6])$/.exec(b.style);
		if (match) return Number(match[1]);
	}
	if (b._type === "heading" && typeof b.level === "number") return b.level;
	return null;
}
