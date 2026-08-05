const PRIME = 4294967291n;

export function minhash(values: readonly number[], size = 128): number[] {
	if (!values.length) return Array(size).fill(0);
	return Array.from({ length: size }, (_, i) => {
		const a = BigInt((Math.imul(i + 1, 0x9e3779b1) >>> 0) || 1);
		const b = BigInt(Math.imul(i + 7, 0x85ebca6b) >>> 0);
		let min = PRIME;
		for (const value of values) { const hash = (a * BigInt(value >>> 0) + b) % PRIME; if (hash < min) min = hash; }
		return Number(min);
	});
}
