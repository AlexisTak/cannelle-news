import { useState } from "react";
import type { PaperMetadata } from "../lib/types";
import { lookupPaper } from "./api";

interface Props {
  blockKey: string;
  currentUrl: string;
  onRefresh: (paper: PaperMetadata) => void;
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
      const body = await lookupPaper(currentUrl, true);
      if (body.ok) {
        onRefresh(body.paper);
        setState({ kind: "idle" });
      } else {
        setState({ kind: "error", message: reasonLabel(body.reason) });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
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
