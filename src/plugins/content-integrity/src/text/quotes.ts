export function detectQuoteSpans(input: string): Array<[number, number]> {
	const spans: Array<[number, number]> = [];
	const stack: number[] = [];
	for (let i = 0; i < input.length; i++) {
		if (input[i] === "«") stack.push(i + 1);
		if (input[i] === "»" && stack.length) spans.push([stack.pop()!, i]);
	}
	for (const expression of [/"([^"\n]+)"/g, /“([^”\n]+)”/g]) {
		let match: RegExpExecArray | null;
		while ((match = expression.exec(input))) spans.push([match.index + 1, match.index + match[0].length - 1]);
	}
	spans.sort((a, b) => a[0] - b[0]);
	return spans.reduce<Array<[number, number]>>((out, span) => {
		const last = out.at(-1);
		if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]); else out.push([...span]);
		return out;
	}, []);
}

/**
 * Masque le contenu cité sans modifier la longueur de la chaîne.
 * Les offsets restent donc utilisables pour localiser les passages originaux.
 */
export function excludeQuotedText(input: string): string {
	const chars = [...input];
	for (const [start, end] of detectQuoteSpans(input)) {
		for (let index = start; index < end; index++) chars[index] = " ";
	}
	return chars.join("");
}
