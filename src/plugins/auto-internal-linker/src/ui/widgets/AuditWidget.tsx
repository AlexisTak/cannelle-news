import { useEffect, useState } from "react";
import { fetchLinkerAudit } from "../api";
import { Button, Status, useAsyncTask } from "../components/Primitives";
import styles from "../styles/Linker.module.css";

interface Summary {
	total: number;
	orphanCount: number;
	poorlyLinkedCount: number;
	unlinkedCount: number;
	zeroIncoming: number;
	zeroOutgoing: number;
}

/**
 * Widget dashboard de l'audit de maillage interne.
 *
 * Résume le nombre d'articles orphelins (ni entrants ni sortants) et le nombre
 * d'articles mal maillés (seulement l'un des deux). Un lien ouvre la page
 * détaillée pour explorer la liste complète.
 */
export function AuditWidget() {
	const [summary, setSummary] = useState<Summary | null>(null);
	const loadTask = useAsyncTask<{ summary: Summary }>();

	useEffect(() => {
		loadTask.run(async () => {
			const result = await fetchLinkerAudit({ threshold: { incoming: 1, outgoing: 1 } });
			setSummary(result.summary);
			return { summary: result.summary };
		});
	}, []);

	async function refresh() {
		const result = await loadTask.run(() =>
			fetchLinkerAudit({ threshold: { incoming: 1, outgoing: 1 } }),
		);
		if (result) setSummary(result.summary);
	}

	const data = summary ?? loadTask.data?.summary;

	return (
		<div className={styles.root}>
			<h3 className={styles.label}>Audit de maillage</h3>
			{loadTask.error && <Status tone="error">{loadTask.error}</Status>}
			{loadTask.notice && <Status tone="success">{loadTask.notice}</Status>}
			{data ? (
				<>
					<p className={styles.hint}>
						<strong>{data.total}</strong> articles analysés ·{" "}
						<strong data-tone={data.orphanCount > 0 ? "error" : undefined}>{data.orphanCount}</strong>{" "}
						orphelins ·{" "}
						<strong>{data.poorlyLinkedCount}</strong> mal maillés
					</p>
					<p className={styles.hint}>
						{data.zeroIncoming} sans lien entrant · {data.zeroOutgoing} sans lien sortant
					</p>
					<div className={styles.row}>
						<Button onClick={() => void refresh()} disabled={loadTask.busy}>
							{loadTask.busy ? "Analyse…" : "Rafraîchir"}
						</Button>
						<a className={styles.button} href="/admin/plugins/auto-internal-linker/audit">
							Voir le détail
						</a>
					</div>
				</>
			) : (
				<p className={styles.status} role="status">Chargement…</p>
			)}
		</div>
	);
}

export default AuditWidget;
