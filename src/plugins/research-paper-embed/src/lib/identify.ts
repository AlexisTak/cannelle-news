const ARXIV_ID = /^\d{4}\.\d{4,5}(v\d+)?$/;
const DOI = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

export interface IdentifyResult {
  source: "arxiv" | "crossref" | null;
  id: string;
  reason?: "unrecognized";
}

export function identify(input: string): IdentifyResult {
  const trimmed = input.trim();
  if (!trimmed) return { source: null, id: "", reason: "unrecognized" };

  const arxivAbs = trimmed.match(/arxiv\.org\/abs\/([\d.]+(v\d+)?)/i);
  if (arxivAbs) return { source: "arxiv", id: arxivAbs[1] };

  const arxivPdf = trimmed.match(/arxiv\.org\/pdf\/([\d.]+(v\d+)?)/i);
  if (arxivPdf) return { source: "arxiv", id: arxivPdf[1] };

  if (ARXIV_ID.test(trimmed)) return { source: "arxiv", id: trimmed };

  const doiUrl = trimmed.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  if (doiUrl) return { source: "crossref", id: doiUrl[1] };

  if (DOI.test(trimmed)) return { source: "crossref", id: trimmed };

  return { source: null, id: trimmed, reason: "unrecognized" };
}
