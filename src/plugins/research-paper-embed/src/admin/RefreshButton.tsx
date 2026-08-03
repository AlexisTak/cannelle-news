import { useState } from "react";

interface Props {
  blockKey: string;
  currentUrl: string;
  onRefresh: (paper: {
    title: string;
    authors: string[];
    publishedDate: string | null;
    abstract: string;
    pdfUrl: string | null;
    doi: string | null;
    fetchedAt: string;
    source: "arxiv" | "crossref";
    sourceId: string;
  }) => void;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function RefreshButton({ blockKey: _blockKey, currentUrl, onRefresh }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleClick() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/_emdash/api/plugins/research-paper-embed/lookup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl, force: true }),
        }
      );
      const body = await res.json();
      if (body.ok) {
        onRefresh(body.paper);
        setState({ kind: "idle" });
      } else {
        setState({ kind: "error", message: reasonLabel(body.reason) });
      }
    } catch (err) {
      setState({ kind: "error", message: "Network error" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state.kind === "loading"}
      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      {state.kind === "loading" ? "Refreshing…" : "Refresh metadata"}
      {state.kind === "error" && <span className="ml-2 text-red-600">({state.message})</span>}
    </button>
  );
}

function reasonLabel(r: string): string {
  return (
    {
      unrecognized: "URL not recognized",
      "not-found": "Paper not found",
      network: "Network error",
      parse: "Parse error",
    } as Record<string, string>
  )[r] ?? r;
}

export default RefreshButton;
