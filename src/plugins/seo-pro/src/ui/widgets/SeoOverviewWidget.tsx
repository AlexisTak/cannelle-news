import { useEffect, useState } from "react";
import styles from "../styles/Dashboard.module.css";
import { ScoreGauge } from "../components/ScoreGauge";
import { fetchReports } from "../api";
import type { ReportSummary } from "../api";
import { gradeFromScore } from "../../domain/scoring";

/** Vignette du tableau de bord : moyenne du site et pires contenus. */
export function SeoOverviewWidget() {
	const [items, setItems] = useState<ReportSummary[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchReports({ sort: "score", limit: 100 })
			.then((page) => setItems(page.items))
			.catch((err: unknown) =>
				setError(err instanceof Error ? err.message : "Erreur inconnue"),
			);
	}, []);

	if (error) return <p className={`${styles.state} ${styles.error}`}>{error}</p>;
	if (items === null) return <p className={styles.state}>Chargement…</p>;
	if (items.length === 0) {
		return <p className={styles.state}>Aucun contenu analysé pour l'instant.</p>;
	}

	const average = Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length);
	// `query` trie déjà par score décroissant : les derniers sont les pires.
	const worst = items.slice(-3).reverse();

	return (
		<div className={styles.page} style={{ padding: "1rem", gap: "1rem" }}>
			<ScoreGauge score={average} grade={gradeFromScore(average)} size="md" />
			<p className={styles.subtitle}>
				Score moyen sur {items.length} contenu{items.length > 1 ? "s" : ""}
			</p>
			<div className={styles.tableWrap}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th scope="col">À revoir en priorité</th>
							<th scope="col">Score</th>
						</tr>
					</thead>
					<tbody>
						{worst.map((item) => (
							<tr key={`${item.collection}-${item.entryId}`}>
								<td className={styles.titleCell}>{item.title ?? item.entryId}</td>
								<td>
									<span className={styles.badge} data-grade={item.grade}>
										{item.score}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default SeoOverviewWidget;
