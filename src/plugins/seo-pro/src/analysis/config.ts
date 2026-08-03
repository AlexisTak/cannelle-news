import type { SeoRule } from "../domain/rules/rule";

export interface RuleConfig {
	config?: Record<string, unknown>;
}

export interface SeoConfig {
	engineVersion: string;
	wordsPerMinute: number;
	analyzableCollections: string[];
	siteUrl: string | null;
	rules: Record<string, RuleConfig>;
}

export const defaultConfig: SeoConfig = {
	engineVersion: "1.0.0",
	wordsPerMinute: 200,
	analyzableCollections: ["posts", "pages"],
	siteUrl: null,
	rules: {},
};

export function mergeConfig(partial: Partial<SeoConfig>): SeoConfig {
	return {
		...defaultConfig,
		...partial,
		rules: { ...defaultConfig.rules, ...partial.rules },
	};
}

/**
 * Fusion superficielle par règle : un override ne cite que les seuils qu'il
 * change, les autres restent au défaut de la règle. Une règle sans config
 * (`heading-structure`, `canonical`) reçoit `undefined`, ce qui est son type.
 */
export function getRuleConfig<T>(config: SeoConfig, rule: SeoRule<T>): T {
	const override = config.rules[rule.id]?.config as Partial<T> | undefined;
	return override ? { ...rule.defaultConfig, ...override } : rule.defaultConfig;
}
