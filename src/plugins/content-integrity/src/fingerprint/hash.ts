export function fnv1a32(value: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
	return hash >>> 0;
}

export function hashNumbers(values: readonly number[], seed = 0): string {
	return fnv1a32(`${seed}:${values.join(",")}`).toString(36);
}
