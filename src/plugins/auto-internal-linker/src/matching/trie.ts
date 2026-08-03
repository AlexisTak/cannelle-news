import { isWordChar } from "./normalize";

interface TrieNode<T> {
	children: Map<string, TrieNode<T>>;
	value?: T;
}

export interface Trie<T> {
	root: TrieNode<T>;
	size: number;
}

/** Une correspondance, en offsets du texte **normalisé**. */
export interface TrieMatch<T> {
	start: number;
	end: number;
	value: T;
}

/**
 * Construit le trie une fois par analyse.
 *
 * Le coût de construction est proportionnel à la taille de l'index, mais celui
 * du balayage ne l'est pas : c'est ce qui permet de tenir le budget CPU de
 * Cloudflare quand l'index atteint quelques centaines d'entrées, là où une
 * expression régulière par mot-clé coûterait O(K × N).
 *
 * Une clé déjà présente est écrasée : l'arbitrage des doublons appartient au
 * domaine (`domain/rules/arbitrate.ts`), pas à la structure de données.
 */
export function buildTrie<T>(entries: Array<{ key: string; value: T }>): Trie<T> {
	const root: TrieNode<T> = { children: new Map() };
	let size = 0;

	for (const { key, value } of entries) {
		if (!key) continue;
		let node = root;
		for (const ch of key) {
			let next = node.children.get(ch);
			if (!next) {
				next = { children: new Map() };
				node.children.set(ch, next);
			}
			node = next;
		}
		if (node.value === undefined) size++;
		node.value = value;
	}

	return { root, size };
}

/**
 * Balaie le texte en une passe, correspondance la plus longue d'abord.
 *
 * Le balayage ne démarre qu'en début de mot et n'accepte qu'une fin de mot :
 * sans ces deux gardes, « llm » matcherait dans « allmande » et produirait des
 * ancres absurdes. Après une correspondance, la reprise se fait à sa fin —
 * deux liens ne peuvent pas se chevaucher dans le même texte.
 */
export function scanTrie<T>(normalized: string, trie: Trie<T>): TrieMatch<T>[] {
	const matches: TrieMatch<T>[] = [];
	if (trie.size === 0) return matches;

	let i = 0;
	while (i < normalized.length) {
		if (isWordChar(normalized[i - 1])) {
			i++;
			continue;
		}

		let node: TrieNode<T> | undefined = trie.root;
		let best: TrieMatch<T> | null = null;

		for (let j = i; j < normalized.length && node; j++) {
			node = node.children.get(normalized[j]);
			if (!node) break;
			// Correspondance retenue seulement si le mot s'arrête ici.
			if (node.value !== undefined && !isWordChar(normalized[j + 1])) {
				best = { start: i, end: j + 1, value: node.value };
			}
		}

		if (best) {
			matches.push(best);
			i = best.end;
		} else {
			i++;
		}
	}

	return matches;
}
