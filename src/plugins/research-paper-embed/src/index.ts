import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { z } from "astro/zod";
import { identify } from "./lib/identify";
import { fetchArxiv } from "./lib/arxiv";
import { fetchCrossref } from "./lib/crossref";
import type { LookupResult, PaperMetadata, PluginContext } from "./lib/types";

export interface ResearchPaperEmbedOptions extends Record<string, unknown> {
  staleDays?: number;
}

export interface LookupInput {
  url: string;
  force?: boolean;
  current?: PaperMetadata;
}

const paperMetadataSchema = z.object({
  source: z.enum(["arxiv", "crossref"]),
  sourceId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  publishedDate: z.string().nullable(),
  abstract: z.string(),
  pdfUrl: z.string().nullable(),
  doi: z.string().nullable(),
  fetchedAt: z.string(),
});

const lookupInputSchema = z.object({
  url: z.string().min(1),
  force: z.boolean().default(false),
  current: paperMetadataSchema.optional(),
});

function isFreshEnough(paper: PaperMetadata, staleDays: number): boolean {
  const fetched = new Date(paper.fetchedAt).getTime();
  if (Number.isNaN(fetched)) return false;
  const ageMs = Date.now() - fetched;
  return ageMs >= 0 && ageMs <= staleDays * 24 * 60 * 60 * 1000;
}

export async function lookupHandler(
  input: LookupInput,
  ctx: PluginContext,
  staleDays = 7
): Promise<LookupResult> {
  if (!input.force && input.current && isFreshEnough(input.current, staleDays)) {
    return { ok: true, paper: input.current };
  }

  const id = identify(input.url);
  if (!id.source) return { ok: false, reason: "unrecognized" };
  return id.source === "arxiv"
    ? fetchArxiv(id.id, ctx)
    : fetchCrossref(id.id, ctx);
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
      portableTextBlocks: [
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
      ],
      fieldWidgets: [
        {
          name: "refresh",
          label: "Refresh paper metadata",
          fieldTypes: ["json", "string", "url"],
        },
      ],
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
