export type PaperSource = "arxiv" | "crossref" | "manual";

export interface PaperMetadata {
  source: Exclude<PaperSource, "manual">;
  sourceId: string;
  title: string;
  authors: string[];
  publishedDate: string | null;
  abstract: string;
  pdfUrl: string | null;
  doi: string | null;
  fetchedAt: string;
}

export interface ResearchPaperBlock {
  _type: "researchPaper";
  _key: string;
  url: string;
  source: PaperSource;
  sourceId: string;
  title: string;
  authors: string[];
  publishedDate: string | null;
  abstract: string;
  pdfUrl: string | null;
  doi: string | null;
  fetchedAt: string | null;
}

export type LookupResult =
  | { ok: true; paper: PaperMetadata }
  | { ok: false; reason: "unrecognized" | "not-found" | "network" | "parse" };

export interface PluginContext {
  http: { fetch: (input: string | URL, init?: RequestInit) => Promise<Response> };
  kv?: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
  };
  log: { error: (msg: string, extra?: unknown) => void };
  plugin: { id: string };
}
