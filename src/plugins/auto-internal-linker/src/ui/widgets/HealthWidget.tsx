import { useEffect, useState } from "react";
import { fetchLinkerHealth, rebuildIndex } from "../api";
import { Button, Status, useAsyncTask } from "../components/Primitives";
import styles from "../styles/Linker.module.css";

interface Health {
	indexSize: number;
	publishedCount: number;
}

/**
 * Widget dashboard de santé de l'index maillage interne.
 *
 * Affiche le nombre d'articles publiés et le nombre de mots-clés indexés, avec
 * un bouton de reconstruction rapide.
 */
export function HealthWidget() {
	const [health, setHealth] = useState<Health | null>(null);
	const loadTask = useAsyncTask<Health>();
	const rebuildTask = useAsyncTask<Awaited<ReturnType<typeof rebuildIndex>>>();

	useEffect(() => {
		loadTask.run(async () => {
			const settings = await fetchLinkerHealth();
			return {
				indexSize: settings.indexSize,
				publishedCount: settings.publishedCount,
			};
		});
	}, []);

	async function handleRebuild() {
		const result = await rebuildTask.run(() => rebuildIndex());
		if (result) {
			const refreshed = await fetchLinkerHealth();
			setHealth({
				indexSize: refreshed.indexSize,
				publishedCount: refreshed.publishedCount,
			});
			loadTask.announce(`Index reconstruit : ${result.entriesProcessed} articles, ${result.keywordsIndexed} mots-clés.`);
		}
	}

	const data = health ?? loadTask.data;

	return (
		<div className={styles.root}>
			<h3 className={styles.label}>Santé du maillage interne</h3>
			{loadTask.error && <Status tone="error">{loadTask.error}</Status>}
			{rebuildTask.error && !loadTask.error && <Status tone="error">{rebuildTask.error}</Status>}
			{loadTask.notice && <Status tone="success">{loadTask.notice}</Status>}
			{data ? (
				<>
					<p className={styles.hint}>
						<strong>{data.publishedCount}</strong> articles publiés analysables ·{" "}
						<strong>{data.indexSize}</strong> mots-clés indexés
					</p>
					{data.publishedCount > 0 && data.indexSize === 0 && (
						<Status tone="info">L'index est vide : lancez une reconstruction.</Status>
					)}
					<Button
						onClick={() => void handleRebuild()}
						disabled={rebuildTask.busy}
						variant="primary"
					>
						{rebuildTask.busy ? "Reconstruction…" : "Reconstruire l'index"}
					</Button>
				</>
			) : (
				<p className={styles.status} role="status">Chargement…</p>
			)}
		</div>
	);
}

export default HealthWidget;
