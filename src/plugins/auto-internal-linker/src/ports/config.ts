import type { LinkerConfig } from "../domain/config";

export interface ConfigStore {
	get(): Promise<LinkerConfig>;
	set(patch: Partial<LinkerConfig>): Promise<void>;
}
