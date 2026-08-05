import { useEffect, useState } from "react";
import { fetchMatches } from "../api";
import styles from "../styles/Integrity.module.css";

export function IntegrityOverviewWidget() {
	const [count, setCount] = useState<number | null>(null);
	useEffect(() => { fetchMatches("new").then((result) => setCount(result.items.length)).catch(() => setCount(null)); }, []);
	return <div className={styles.panel}><strong>{count ?? "—"}</strong><p className={styles.muted}>constats à examiner</p><a href="/_emdash/admin/plugins/content-integrity/integrity">Ouvrir la revue</a></div>;
}
