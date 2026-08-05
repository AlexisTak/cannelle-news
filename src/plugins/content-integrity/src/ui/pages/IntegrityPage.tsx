import { useEffect, useState } from "react";
import { DEFAULT_CONFIG, type IntegrityConfig } from "../../domain/config";
import type { Match, MatchStatus } from "../../domain/types";
import { fetchMatches, fetchSettings, rebuildAll, review, saveSettings } from "../api";
import styles from "../styles/Integrity.module.css";

export function IntegrityPage() {
	const [tab, setTab] = useState<"matches" | "settings">("matches");
	const [matches, setMatches] = useState<Match[]>([]), [config, setConfig] = useState<IntegrityConfig>(DEFAULT_CONFIG);
	const [matchesCursor, setMatchesCursor] = useState<string | undefined>(), [matchesHaveMore, setMatchesHaveMore] = useState(false);
	const [meta, setMeta] = useState({ indexSize: 0, matchCount: 0 }), [message, setMessage] = useState("Chargement…"), [error, setError] = useState("");
	async function load() {
		try { const [list, settings] = await Promise.all([fetchMatches(), fetchSettings()]); setMatches(list.items.map((item) => item.data)); setMatchesCursor(list.cursor); setMatchesHaveMore(list.hasMore); setConfig(settings.config); setMeta(settings); setMessage(""); }
		catch (reason) { setError(reason instanceof Error ? reason.message : "Erreur inconnue"); }
	}
	useEffect(() => { void load(); }, []);
	async function change(id: string, status: MatchStatus) { await review(id, status); await load(); }
	async function loadMore() { if (!matchesCursor) return; const page = await fetchMatches(undefined, matchesCursor); setMatches((current) => [...current, ...page.items.map((item) => item.data)]); setMatchesCursor(page.cursor); setMatchesHaveMore(page.hasMore); }
	async function runRebuild() { const result = await rebuildAll(); setMessage(`${result.processed} articles analysés.`); await load(); }
	async function save() { const result = await saveSettings(config); setConfig(result.config); setMessage("Paramètres enregistrés."); }
	return <main className={styles.root}>
		<header className={styles.header}><div><h1>Intégrité éditoriale</h1><p className={styles.muted}>Détection consultative des reprises et doublons internes.</p></div><div><strong>{meta.matchCount}</strong> constats · <strong>{meta.indexSize}</strong> articles indexés</div></header>
		<nav className={styles.tabs}><button className={`${styles.button} ${tab === "matches" ? styles.primary : ""}`} onClick={() => setTab("matches")}>Constats</button><button className={`${styles.button} ${tab === "settings" ? styles.primary : ""}`} onClick={() => setTab("settings")}>Paramètres</button></nav>
		{error && <p className={`${styles.status} ${styles.error}`}>{error}</p>}{message && <p className={styles.status}>{message}</p>}
		{tab === "matches" ? <section className={styles.panel}><table className={styles.table}><thead><tr><th>Articles</th><th>Score</th><th>Passage commun</th><th>Décision</th></tr></thead><tbody>{matches.map((match: Match) => <tr key={match.id}><td><strong>{match.sourceTitle}</strong><br/><span className={styles.muted}>↔ {match.targetTitle}</span></td><td><span className={styles.badge} data-severity={match.severity}>{Math.round(match.score * 100)} % · {match.severity}</span><br/><small>{match.status}</small></td><td className={styles.excerpt}>{match.sourceExcerpt}</td><td><div className={styles.actions}><button className={styles.button} onClick={() => void change(match.id, "confirmed")}>Confirmer</button><button className={`${styles.button} ${styles.danger}`} onClick={() => void change(match.id, "dismissed")}>Écarter</button></div></td></tr>)}</tbody></table>{!matches.length && <p className={styles.muted}>Aucun constat pour le moment.</p>}{matchesHaveMore && <button className={styles.button} onClick={() => void loadMore()}>Charger la suite</button>}</section> :
		<section className={styles.panel}><div className={styles.grid}><label className={styles.field}>Collections<input value={config.collections.join(", ")} onChange={(e) => setConfig({ ...config, collections: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}/></label><label className={styles.field}>Taille des shingles<input type="number" min="2" max="12" value={config.shingleWidth} onChange={(e) => setConfig({ ...config, shingleWidth: Number(e.target.value) })}/></label><label className={styles.field}>Seuil minimal<input type="number" min="0.05" max="1" step="0.01" value={config.thresholds.ignore} onChange={(e) => setConfig({ ...config, thresholds: { ...config.thresholds, ignore: Number(e.target.value) } })}/></label></div><p className={styles.muted}>Changer la taille des shingles nécessite une reconstruction de l’index.</p><div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} onClick={() => void save()}>Enregistrer</button><button className={styles.button} onClick={() => void runRebuild()}>Reconstruire l’index</button></div></section>}
	</main>;
}
