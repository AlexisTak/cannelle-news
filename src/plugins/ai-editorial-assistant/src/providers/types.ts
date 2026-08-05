/**
 * Port de sortie vers un modèle de langage.
 *
 * Une seule opération : un couple (consigne système, message utilisateur) rend
 * du texte. Ni streaming, ni tool-calling, ni historique de conversation — les
 * quatre actions du plugin sont des transformations sans état, et une
 * abstraction plus riche ne serait qu'une dette à porter.
 *
 * Le `fetch` est injecté plutôt qu'importé : en production c'est
 * `ctx.http.fetch`, qui valide l'hôte contre `allowedHosts` à chaque
 * redirection (`emdash/dist/context-B6hc7zJL.mjs:796`) ; en test c'est une
 * fonction locale, ce qui évite tout accès réseau.
 */
export type HttpFetch = (url: string, init?: RequestInit) => Promise<Response>;

const MAX_RESPONSE_BYTES = 1_000_000;
const PROVIDER_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(fetchImpl: HttpFetch, url: string, init: RequestInit = {}): Promise<Response> {
	// Le signal reste attaché au corps de la réponse après réception des
	// en-têtes : le délai couvre donc aussi la lecture JSON, pas seulement fetch().
	return fetchImpl(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
}

export async function readJsonLimited<T>(response: Response): Promise<T> {
	const text = await readTextLimited(response, MAX_RESPONSE_BYTES);
	return JSON.parse(text) as T;
}

async function readTextLimited(response: Response, maxBytes: number): Promise<string> {
	const declared = Number(response.headers.get("content-length") ?? 0);
	if (declared > maxBytes) throw new Error("réponse fournisseur trop volumineuse");
	if (!response.body) return "";
	const reader = response.body.getReader(), decoder = new TextDecoder();
	let size = 0, text = "";
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > maxBytes) { await reader.cancel(); throw new Error("réponse fournisseur trop volumineuse"); }
		text += decoder.decode(value, { stream: true });
	}
	return text + decoder.decode();
}

export interface CompletionRequest {
	system: string;
	user: string;
	model: string;
	maxTokens: number;
}

export interface LlmProvider {
	/** Identifiant lisible, repris dans les messages d'erreur et l'UI. */
	readonly id: ProviderId;
	complete(request: CompletionRequest): Promise<string>;
}

export const PROVIDER_IDS = ["ollama", "anthropic", "openai"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export class ProviderError extends Error {
	constructor(
		readonly provider: ProviderId,
		message: string,
	) {
		super(`ai-editorial-assistant: ${provider} — ${message}`);
		this.name = "ProviderError";
	}
}

/**
 * Message d'erreur exploitable par un rédacteur.
 *
 * Un 401 doit dire « clé invalide », pas « HTTP 401 » : la personne devant
 * l'écran n'a pas accès aux logs du worker et doit pouvoir corriger seule.
 */
export function describeHttpFailure(provider: ProviderId, status: number, body: string): string {
	const detail = body.trim().slice(0, 300);

	if (status === 401 || status === 403) {
		return `clé API refusée (HTTP ${status}). Vérifiez la clé dans les réglages du plugin.`;
	}
	if (status === 404) {
		return `modèle ou endpoint introuvable (HTTP 404). Vérifiez le nom du modèle.${
			provider === "ollama" ? " Sur Ollama : `ollama pull <modèle>`." : ""
		}`;
	}
	if (status === 429) {
		return "quota atteint (HTTP 429). Réessayez dans quelques instants.";
	}
	if (status >= 500) {
		return `le fournisseur est indisponible (HTTP ${status}). Réessayez plus tard.`;
	}
	return `requête refusée (HTTP ${status})${detail ? ` : ${detail}` : ""}`;
}

/** Lecture du corps d'erreur sans jamais faire échouer la gestion d'erreur. */
export async function safeText(response: Response): Promise<string> {
	try {
		return await readTextLimited(response, 8_192);
	} catch {
		return "";
	}
}
