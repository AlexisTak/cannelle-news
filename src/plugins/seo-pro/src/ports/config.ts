import type { SeoConfig } from "../analysis/config";

export interface ConfigStore {
	get(): Promise<SeoConfig>;
	set(config: Partial<SeoConfig>): Promise<void>;
}
