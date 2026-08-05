const DOI = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
const ARXIV_ID = /^\d{4}\.\d{4,5}(v\d+)?$/;

/** URL HTTP(S) rendable, avec canonicalisation des identifiants nus. */
export function safePaperHref(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DOI.test(trimmed)) return `https://doi.org/${trimmed}`;
  if (ARXIV_ID.test(trimmed)) return `https://arxiv.org/abs/${trimmed}`;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
