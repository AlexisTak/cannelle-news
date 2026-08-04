import { useEffect, useState } from "react";
import { fetchLinkerAudit } from "../api";
import { Button, Section, Status, useAsyncTask } from "../components/Primitives";
import styles from "../styles/Linker.module.css";

interface AuditItem {
	id: string;
	collection: string;
	slug: string | null;
	title: string;
	incomingCount: number;
	outgoingCount: number;
	status: "orphan" | "poorly-linked" | "ok";
}

interface AuditData {
	summary: {
		total: number;
		orphanCount: number;
		poorlyLinkedCount: number;
		unlinkedCount: number;
		zeroIncoming: number;
		zeroOutgoing: number;
	};
	items: AuditItem[];
	threshold: { incoming: number; outgoing: number };
	hasMore: boolean;
	cursor?: string;
}

/**
 * Page détaillée d'audit du maillage interne.
 *
 * Affiche un résumé, des seuils configurables, et la liste paginée des
 * articles classés par gravité : orphelins d'abord, puis mal maillés, puis OK.
 */
export function AuditPage() {
	const [threshold, setThreshold] = useState({ incoming: 1, outgoing: 1 });
	const [data, setData] = useState<AuditData | null>(null);
	const loadTask = useAsyncTask<AuditData>();

	async function load(nextCursor?: string) {
		const result = await loadTask.run(() =>
			fetchLinkerAudit({ threshold, cursor: nextCursor, limit: 50 }),
		);
		if (!result) return;

		if (nextCursor) {
			setData((prev) =>
				prev
					? {
							...result,
							items: [...prev.items, ...result.items],
					  }
					: result,
			);
		} else {
			setData(result);
		}
	}

	useEffect(() => {
		load();
	}, [threshold.incoming, threshold.outgoing]);

	function statusLabel(status: AuditItem["status"]): string {
		if (status === "orphan") return "Orphelin";
		if (status === "poorly-linked") return "Mal maillé";
		return "OK";
	}

	function statusTone(status: AuditItem["status"]): "error" | "info" | "success" {
		if (status === "orphan") return "error";
		if (status === "poorly-linked") return "info";
		return "success";
	}

	return (
		<div className={styles.root}>
			<h1 className={styles.label}>Audit de maillage interne</h1>
			<p className={styles.hint}>
				Un article est orphelin quand il a moins de {threshold.incoming} lien entrant et moins de{" "}
				{threshold.outgoing} lien sortant interne. Les seuils sont configurables ci-dessous.
			</p>

			<Section title="Seuils d'alerte" hint="Nombre minimum de liens pour ne pas être signalé.">
				<div className={styles.row}>
					<label className={styles.hint}>
						Liens entrants minimum
						<input
							className={styles.input}
							type="number"
							min={0}
							value={threshold.incoming}
							onChange={(event) =>
								setThreshold((prev) => ({ ...prev, incoming: Number(event.target.value) }))
							}
							style={{ width: "4rem" }}
						/>
					</label>
					<label className={styles.hint}>
						Liens sortants minimum
						<input
							className={styles.input}
							type="number"
							min={0}
							value={threshold.outgoing}
							onChange={(event) =>
								setThreshold((prev) => ({ ...prev, outgoing: Number(event.target.value) }))
							}
							style={{ width: "4rem" }}
						/>
					</label>
				</div>
			</Section>

			{loadTask.error && <Status tone="error">{loadTask.error}</Status>}
			{loadTask.notice && <Status tone="success">{loadTask.notice}</Status>}

			{data && (
				<Section
					title="Résumé"
					hint={`${data.summary.total} articles analysés`}
				>
					<div className={styles.row}>
						<Status tone={data.summary.orphanCount > 0 ? "error" : "success"}>
							{data.summary.orphanCount} orphelin{data.summary.orphanCount > 1 ? "s" : ""}
						</Status>
						<Status tone={data.summary.poorlyLinkedCount > 0 ? "info" : "success"}>
							{data.summary.poorlyLinkedCount} mal maillé
							{data.summary.poorlyLinkedCount > 1 ? "s" : ""}
						</Status>
						<span className={styles.hint}>
							{data.summary.zeroIncoming} sans lien entrant · {data.summary.zeroOutgoing} sans lien sortant
						</span>
					</div>
				</Section>
			)}

			{data && data.items.length > 0 && (
				<Section title="Articles" hint="Triés par gravité décroissante.">
					<ul className={styles.suggestions}>
						{data.items.map((item) => (
							<li key={`${item.collection}:${item.id}`} className={styles.suggestion}>
								<div className={styles.suggestionBody}>
									<span className={styles.suggestionText}>
										<strong>{item.title || item.id}</strong>{" "}
										<span className={styles.hint}>({item.collection})</span>
									</span>
									<span className={styles.context}>
										{item.incomingCount} lien{item.incomingCount > 1 ? "s" : ""} entrant ·{" "}
										{item.outgoingCount} lien{item.outgoingCount > 1 ? "s" : ""} sortant
									</span>
								</div>
								<Status tone={statusTone(item.status)}>{statusLabel(item.status)}</Status>
							</li>
						))}
					</ul>
					{data.hasMore && (
						<Button
							onClick={() => void load(data.cursor)}
							disabled={loadTask.busy}
							variant="primary"
						>
							{loadTask.busy ? "Chargement…" : "Charger la suite"}
						</Button>
					)}
				</Section>
			)}

			{data && data.items.length === 0 && (
				<Status tone="success">Aucun article ne dépasse les seuils d'alerte.</Status>
			)}
		</div>
	);
}

export default AuditPage;
