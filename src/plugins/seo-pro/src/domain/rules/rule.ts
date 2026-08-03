import type { SeoDocument } from "../document";
import type { Issue } from "../report";

export interface RuleEnv {
	focusKeyword: string | null;
}

export interface RuleResult {
	score: number;
	metrics?: Record<string, unknown>;
	issues: Issue[];
}

/**
 * Contrat d'une règle SEO. `analyze` est pure : mêmes entrées, même sortie,
 * aucun accès réseau ni horloge. C'est ce qui rend chaque règle testable
 * isolément et le moteur rejouable.
 */
export interface SeoRule<TConfig = unknown> {
	id: string;
	label: string;
	defaultConfig: TConfig;
	analyze(doc: SeoDocument, config: TConfig, env: RuleEnv): RuleResult;
}
