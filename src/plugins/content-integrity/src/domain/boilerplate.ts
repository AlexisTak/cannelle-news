const ROWS = 4;
const WIDTH = 2048;
const SEEDS = [0x9e3779b1, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f];

export interface BoilerplateStats { documentCount: number; buckets: number[][] }

export function emptyBoilerplateStats(): BoilerplateStats {
	return { documentCount: 0, buckets: Array.from({ length: ROWS }, () => Array(WIDTH).fill(0)) };
}

export function addDocument(stats: BoilerplateStats, hashes: readonly number[]): void {
	stats.documentCount++;
	for (const hash of new Set(hashes)) {
		for (let row = 0; row < ROWS; row++) stats.buckets[row][bucket(hash, row)]++;
	}
}

export function documentFrequency(stats: BoilerplateStats, hash: number): number {
	if (!stats.buckets.length) return 0;
	return Math.min(...stats.buckets.map((row, index) => row[bucket(hash, index)] ?? 0));
}

export function filterBoilerplate(hashes: readonly number[], stats: BoilerplateStats | null, threshold = 0.02): number[] {
	if (!stats || stats.documentCount < 20) return [...hashes];
	const minimumDocuments = Math.max(3, Math.ceil(stats.documentCount * threshold));
	return hashes.filter((hash) => documentFrequency(stats, hash) < minimumDocuments);
}

function bucket(hash: number, row: number): number {
	let value = (hash ^ SEEDS[row]) >>> 0;
	value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
	value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
	return ((value ^ (value >>> 16)) >>> 0) % WIDTH;
}
