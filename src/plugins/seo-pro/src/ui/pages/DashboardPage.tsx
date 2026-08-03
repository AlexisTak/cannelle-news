import { useEffect, useState } from "react";
import { useNavigate } from "@emdash-cms/admin";
import styles from "../styles/Dashboard.module.css";
import { PageShell, LoadingState, ErrorState, EmptyState } from "../components/PageShell";
import { MetricCard } from "../components/MetricCard";
import { fetchReports } from "../api";
import type { ReportSummary } from "../api";
import type { Grade } from "../../domain/report";

type Sort = "score" | "analyzedAt";
type GradeFilter = "" | Grade;

export function DashboardPage() {
	const navigate = useNavigate();
	const [items, setItems] = useState<ReportSummary[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [collection, setCollection] = useState("");
	const [sort, setSort] = useState<Sort>("score");
	const [grade, setGrade] = useState<GradeFilter>("");

	useEffect(() => {
		let cancelled = false;
		setStatus("loading");

		fetchReports({
			collection: collection || undefined,
			sort,
			grade: grade || undefined,
			limit: 100,
		})
			.then((page) => {
				// Une réponse arrivée après un changement de filtre écraserait la
				// plus récente : on l'ignore.
				if (cancelled) return;
				setItems(page.items);
				setStatus("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Erreur inconnue");
				setStatus("error");
			});

		return () => {
			cancelled = true;
		};
	}, [collection, sort, grade]);

	const average =
		items.length === 0
			? 0
			: Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length);
	const poor = items.filter((i) => i.grade === "poor").length;
	const good = items.filter((i) => i.grade === "good").length;

	return (
		<PageShell
			title="SEO Dashboard"
			subtitle="Qualité SEO des contenus analysés"
			actions={
				<div className={styles.filters}>
					<select
						value={collection}
						onChange={(e) => setCollection(e.target.value)}
						aria-label="Filtrer par collection"
					>
						<option value="">Toutes les collections</option>
						<option value="posts">Articles</option>
						<option value="pages">Pages</option>
					</select>
					<select
						value={grade}
						onChange={(e) => setGrade(e.target.value as GradeFilter)}
						aria-label="Filtrer par note"
					>
						<option value="">Toutes les notes</option>
						<option value="good">Bon</option>
						<option value="ok">Moyen</option>
						<option value="poor">Faible</option>
					</select>
					<select
						value={sort}
						onChange={(e) => setSort(e.target.value as Sort)}
						aria-label="Trier"
					>
						<option value="score">Trier par score</option>
						<option value="analyzedAt">Trier par date d'analyse</option>
					</select>
				</div>
			}
		>
			{status === "loading" && <LoadingState />}
			{status === "error" && <ErrorState message={error} />}

			{status === "ready" && (
				<>
					<div className={styles.summary}>
						<MetricCard
							label="Contenus analysés"
							value={items.length}
							status={items.length > 0 ? "good" : "warning"}
						/>
						<MetricCard
							label="Score moyen"
							value={average}
							ideal="80 et plus"
							status={average >= 80 ? "good" : average >= 60 ? "warning" : "error"}
						/>
						<MetricCard
							label="Bons"
							value={good}
							status={good > 0 ? "good" : "warning"}
						/>
						<MetricCard
							label="À revoir"
							value={poor}
							status={poor === 0 ? "good" : "error"}
						/>
					</div>

					{items.length === 0 ? (
						<EmptyState label="Aucun rapport. Enregistre un article pour déclencher une analyse." />
					) : (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th scope="col">Titre</th>
										<th scope="col">Collection</th>
										<th scope="col">Score</th>
										<th scope="col">Note</th>
										<th scope="col">Analysé le</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<tr key={`${item.collection}-${item.entryId}`}>
											<td className={styles.titleCell}>
												<button
													type="button"
													className={styles.rowLink}
													onClick={() =>
														// TanStack Router : `navigate` prend un objet, et les
														// routes de plugin sont hors de son arbre typé, d'où le cast.
														navigate({
															to: "/plugins/seo-pro/entry",
															search: { collection: item.collection, id: item.entryId },
														} as never)
													}
												>
													{item.title ?? item.entryId}
												</button>
											</td>
											<td>{item.collection}</td>
											<td>{item.score}</td>
											<td>
												<span className={styles.badge} data-grade={item.grade}>
													{item.grade}
												</span>
											</td>
											<td>{new Date(item.analyzedAt).toLocaleDateString("fr-FR")}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}
		</PageShell>
	);
}

export default DashboardPage;
