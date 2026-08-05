export function compareSets(aValues: readonly number[], bValues: readonly number[]) {
	const a = new Set(aValues), b = new Set(bValues);
	let intersection = 0;
	for (const value of a) if (b.has(value)) intersection++;
	const union = a.size + b.size - intersection;
	return {
		intersection,
		sourceContainment: a.size ? intersection / a.size : 0,
		targetContainment: b.size ? intersection / b.size : 0,
		jaccard: union ? intersection / union : 0,
	};
}
