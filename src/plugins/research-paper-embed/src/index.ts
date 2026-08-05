import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { z } from "astro/zod";
import { identify } from "./lib/identify";
import { fetchArxiv } from "./lib/arxiv";
import { fetchCrossref } from "./lib/crossref";
import type { LookupResult, PluginContext } from "./lib/types";

export interface ResearchPaperEmbedOptions extends Record<string, unknown> {
  staleDays?: number;
}

export interface LookupInput {
  url: string;
  force?: boolean;
}

const lookupInputSchema = z.object({
  url: z.string().min(1),
  force: z.boolean().default(false),
});

const researchPaperBlocks: NonNullable<PluginDescriptor["portableTextBlocks"]> = [
  {
    type: "researchPaper",
    label: "Research Paper",
    icon: "link-external",
    placeholder: "Paste arXiv URL or DOI...",
    fields: [
      { type: "text_input", action_id: "url", label: "arXiv URL or DOI" },
      { type: "toggle", action_id: "manual", label: "Manual metadata" },
    ],
  },
];

export async function lookupHandler(
  input: LookupInput,
  ctx: PluginContext,
  staleDays = 7,
): Promise<LookupResult> {
  const id = identify(input.url);
  if (!id.source) return { ok: false, reason: "unrecognized" };
  const cacheKey = `paper:${id.source}:${id.id}`;
  if (!input.force && ctx.kv) {
    const cached = await ctx.kv.get<LookupResult>(cacheKey);
    if (cached?.ok && Date.now() - Date.parse(cached.paper.fetchedAt) < staleDays * 86_400_000) return cached;
  }
  const result = id.source === "arxiv"
    ? fetchArxiv(id.id, ctx)
    : fetchCrossref(id.id, ctx);
  const resolved = await result;
  if (resolved.ok && ctx.kv) await ctx.kv.set(cacheKey, resolved);
  return resolved;
}

export function researchPaperEmbedPlugin(
  options: ResearchPaperEmbedOptions = {}
): PluginDescriptor {
  return {
    id: "research-paper-embed",
    version: "0.1.0",
    format: "native",
    entrypoint: "@cannelle/plugin-research-paper-embed",
    componentsEntry: "@cannelle/plugin-research-paper-embed/astro",
    adminEntry: "@cannelle/plugin-research-paper-embed/admin",
    portableTextBlocks: researchPaperBlocks,
    options,
  };
}

export function createPlugin(options: ResearchPaperEmbedOptions = {}) {
  const staleDays = options.staleDays ?? 7;

  return definePlugin({
    id: "research-paper-embed",
    version: "0.1.0",
    capabilities: ["network:request"],
    allowedHosts: ["export.arxiv.org", "api.crossref.org"],

    admin: {
      entry: "@cannelle/plugin-research-paper-embed/admin",
      portableTextBlocks: researchPaperBlocks,
    },

    routes: {
      lookup: {
        input: lookupInputSchema,
        handler: async (ctx) =>
          lookupHandler(ctx.input as LookupInput, ctx as PluginContext, staleDays),
      },
    },

    hooks: {
      "plugin:install": async (_event, ctx) => {
        ctx.log.info("research-paper-embed installed", { staleDays });
      },
    },
  });
}

export default createPlugin;
