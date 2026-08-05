import { hashNumbers } from "./hash";

export interface Band { bandIndex: number; bandHash: string }

export function createBands(signature: readonly number[], rows = 4): Band[] {
	if (rows < 1 || signature.length % rows !== 0) throw new Error("La signature doit être divisible par rows");
	return Array.from({ length: signature.length / rows }, (_, bandIndex) => ({
		bandIndex,
		bandHash: hashNumbers(signature.slice(bandIndex * rows, (bandIndex + 1) * rows), bandIndex),
	}));
}
