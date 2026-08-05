import type { IntegrityConfig } from "../domain/config";
import { normalize } from "../text/normalize";
import { excludeQuotedText } from "../text/quotes";
import { createShingles } from "../text/shingles";
import { fnv1a32 } from "./hash";
import { minhash } from "./minhash";

export function fingerprintText(text: string, config: IntegrityConfig) {
	const normalized = normalize(excludeQuotedText(text));
	const hashes = [...new Set(createShingles(normalized.words, config.shingleWidth).map((item) => item.hash))];
	return {
		contentHash: fnv1a32(normalized.words.join(" ")).toString(36),
		shingleHashes: hashes,
		signature: minhash(hashes, config.signatureSize),
	};
}
