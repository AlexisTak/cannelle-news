import { useEffect } from "react";
import { fetchMissingMeta } from "../api";
import { Button, Status, useAsyncTask } from "../components/Primitives";
import styles from "../styles/Assistant.module.css";

interface MissingMetaData {
	articlesChecked: number;
	withoutTldr: number;
	withoutMetaDescription: number;
	withoutSeoTitle: number;
	hasMore: boolean;
	items: Array<{
		collection: string;
		id: string;
		title: string;
		missingTldr: boolean;
		missingMetaDescription: boolean;
		missingSeoTitle: boolean;
	}>;
}

/**
 * Widget dashboard listant les articles publiés sans TL;DR ni meta description.
 *
 * Le comptage se fait côté serveur en balayant les collections configurées ;
 * le widget n'a besoin d'aucune prop, conformément au contrat `PluginAdminModule`.
 */
export function MissingMetaWidget() {
	const task = useAsyncTask<MissingMetaData>();

	useEffect(() => {
		task.run(() => fetchMissingMeta());
	}, []);

	return (
		<div className={styles.root}>
			<h3 className={styles.label}>Articles sans TL;DR/meta</h3>
			{task.error && <Status tone="error">{task.error}</Status>}
			{task.notice && <Status tone="success">{task.notice}</Status>}
			{task.data ? (
				<>
					<p className={styles.hint}>
						<strong>{task.data.articlesChecked}</strong> articles analysés sur cette page{task.data.hasMore ? " (d’autres articles restent à parcourir)" : ""}
					</p>
					<ul className={styles.proposals}>
						<li className={styles.proposal}>
							<span className={styles.proposalText}>Sans TL;DR</span>
							<span className={styles.counter}>{task.data.withoutTldr}</span>
						</li>
						<li className={styles.proposal}>
							<span className={styles.proposalText}>Sans meta description</span>
							<span className={styles.counter}>{task.data.withoutMetaDescription}</span>
						</li>
						<li className={styles.proposal}>
							<span className={styles.proposalText}>Sans titre SEO</span>
							<span className={styles.counter}>{task.data.withoutSeoTitle}</span>
						</li>
					</ul>
					{task.data.items.length > 0 && (
						<div className={styles.section}>
							<div className={styles.sectionHeader}>
								<span className={styles.sectionTitle}>Articles concernés</span>
							</div>
							<ul className={styles.proposals}>
								{task.data.items.slice(0, 5).map((item) => (
									<li key={`${item.collection}:${item.id}`} className={styles.proposal}>
										<span className={styles.proposalText}>
											{item.title || `${item.collection}/${item.id}`}
											{item.missingTldr && item.missingMetaDescription ? " — TL;DR + meta" : ""}
											{item.missingTldr && !item.missingMetaDescription ? " — TL;DR" : ""}
											{!item.missingTldr && item.missingMetaDescription ? " — meta" : ""}
											{item.missingSeoTitle && !item.missingTldr && !item.missingMetaDescription ? " — titre SEO" : ""}
										</span>
									</li>
								))}
								{task.data.items.length > 5 && (
									<li className={styles.proposal}>
										<span className={styles.proposalText}>
											… et {task.data.items.length - 5} autres
										</span>
									</li>
								)}
							</ul>
						</div>
					)}
					<Button onClick={() => void task.run(() => fetchMissingMeta())} disabled={task.busy} variant="primary">
						{task.busy ? "Analyse…" : "Rafraîchir"}
					</Button>
				</>
			) : (
				<p className={styles.status} role="status">Chargement…</p>
			)}
		</div>
	);
}

export default MissingMetaWidget;
