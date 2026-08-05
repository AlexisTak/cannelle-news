export interface IntegrityConfig {
	collections: string[];
	shingleWidth: number;
	signatureSize: number;
	bandRows: number;
	candidateLimit: number;
	thresholds: { ignore: number; low: number; medium: number; high: number };
}

export const DEFAULT_CONFIG: IntegrityConfig = {
	collections: ["posts"], shingleWidth: 6, signatureSize: 128, bandRows: 4, candidateLimit: 20,
	thresholds: { ignore: 0.05, low: 0.12, medium: 0.25, high: 0.45 },
};

export function mergeConfig(patch: Partial<IntegrityConfig> = {}): IntegrityConfig {
	return { ...DEFAULT_CONFIG, ...patch, collections: patch.collections?.filter(Boolean) ?? DEFAULT_CONFIG.collections, thresholds: { ...DEFAULT_CONFIG.thresholds, ...patch.thresholds } };
}

export function assertValidConfig(config: IntegrityConfig): void {
	if (!config.collections.length || config.collections.some((value) => !/^[a-z][a-z0-9_-]{0,63}$/.test(value))) throw new Error("Collections invalides");
	if (config.shingleWidth < 2 || config.shingleWidth > 12) throw new Error("Taille de shingle invalide");
	if (config.signatureSize < 16 || config.signatureSize > 512) throw new Error("Taille de signature invalide");
	if (config.bandRows < 1 || config.bandRows > 16 || config.signatureSize % config.bandRows !== 0) throw new Error("Découpage des bandes invalide");
	if (config.candidateLimit < 1 || config.candidateLimit > 100) throw new Error("Limite de candidats invalide");
	const { ignore, low, medium, high } = config.thresholds;
	if (![ignore, low, medium, high].every((value) => Number.isFinite(value) && value >= 0 && value <= 1) || !(ignore <= low && low <= medium && medium <= high)) throw new Error("Seuils d’intégrité invalides");
}
