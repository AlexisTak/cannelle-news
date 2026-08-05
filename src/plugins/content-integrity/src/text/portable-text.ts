export interface ExtractedText { text: string; blockquoteZones: Array<[number, number]> }

export function extractText(value: unknown): ExtractedText {
	if (typeof value === "string") return { text: value, blockquoteZones: [] };
	if (!Array.isArray(value)) return { text: "", blockquoteZones: [] };
	const parts: string[] = [];
	const zones: Array<[number, number]> = [];
	let offset = 0;
	for (const block of value) {
		if (!block || typeof block !== "object") continue;
		const record = block as Record<string, unknown>;
		const children = Array.isArray(record.children) ? record.children : [];
		const text = children.map((child) => child && typeof child === "object" ? String((child as Record<string, unknown>).text ?? "") : "").join("").trim();
		if (!text) continue;
		if (record.style === "blockquote") { zones.push([offset, offset + text.length]); continue; }
		if (parts.length) offset++;
		parts.push(text);
		offset += text.length;
	}
	return { text: parts.join(" "), blockquoteZones: zones };
}
