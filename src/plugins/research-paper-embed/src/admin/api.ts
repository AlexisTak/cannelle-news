import { apiFetch } from "@emdash-cms/admin";
import type { LookupResult } from "../lib/types";

const LOOKUP_URL = "/_emdash/api/plugins/research-paper-embed/lookup";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { code?: string; message?: string } };

export async function lookupPaper(url: string, force = true): Promise<LookupResult> {
  const response = await apiFetch(LOOKUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, force }),
  });

  const payload = (await response.json()) as ApiEnvelope<LookupResult>;
  if (!payload.success) {
    throw new Error(payload.error?.message || payload.error?.code || "Plugin API error");
  }

  return payload.data;
}
