import { normalize } from "../text/normalize";

export interface PassagePair { source: string; target: string }

export function alignPassages(source: string, target: string, width = 12): PassagePair[] {
	const a = normalize(source).words, b = normalize(target).words;
	if (a.length < width || b.length < width) return [];
	const targetWindows = new Map<string, number>();
	for (let i = 0; i <= b.length - width; i++) targetWindows.set(b.slice(i, i + width).join(" "), i);
	const pairs: PassagePair[] = [];
	let lastSourceEnd = -1;
	for (let i = 0; i <= a.length - width && pairs.length < 3; i++) {
		const key = a.slice(i, i + width).join(" "), j = targetWindows.get(key);
		if (j === undefined) continue;
		if (i <= lastSourceEnd) continue;
		pairs.push({ source: a.slice(Math.max(0, i - 4), i + width + 4).join(" "), target: b.slice(Math.max(0, j - 4), j + width + 4).join(" ") });
		lastSourceEnd = i + width + 4;
		i += width - 1;
	}
	return pairs;
}
