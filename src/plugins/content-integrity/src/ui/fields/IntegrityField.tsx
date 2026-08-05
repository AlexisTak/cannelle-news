import { useState } from "react";
import type { Match } from "../../domain/types";
import { checkEntry } from "../api";
import styles from "../styles/Integrity.module.css";

const EDITOR_PATH = /\/content\/([^/]+)\/([^/?#]+)/;

export function IntegrityField() {
	const [matches, setMatches] = useState<Match[] | null>(null), [error, setError] = useState("");
	const match = typeof window === "undefined" ? null : EDITOR_PATH.exec(window.location.pathname);
	async function analyze() {
		if (!match || match[2] === "new") return;
		try { setError(""); setMatches(await checkEntry(decodeURIComponent(match[1]), decodeURIComponent(match[2]))); }
		catch (reason) { setError(reason instanceof Error ? reason.message : "Analyse impossible"); }
	}
	return <section className={styles.panel}>
		<strong>Intégrité éditoriale</strong><p className={styles.muted}>Contrôle consultatif sur la dernière version enregistrée.</p>
		<button type="button" className={styles.button} onClick={() => void analyze()} disabled={!match || match[2] === "new"}>Analyser les ressemblances</button>
		{error && <p className={`${styles.status} ${styles.error}`}>{error}</p>}
		{matches && <p className={styles.status}>{matches.length ? `${matches.length} rapprochement(s) à examiner.` : "Aucune reprise significative détectée."}</p>}
	</section>;
}
