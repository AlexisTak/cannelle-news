import { useState } from "react";
import { META_DESCRIPTION_MAX } from "../../../domain/actions";
import { applySeo, generate, type GenerateOutput } from "../../api";
import {
	Button,
	Counter,
	Section,
	Status,
	copyToClipboard,
	formatVersion,
	useAsyncTask,
} from "../../components/Primitives";
import type { EntryRef } from "../../entry-ref";
import styles from "../../styles/Assistant.module.css";

/**
 * « Rédiger la Meta Description » (155 caractères maximum).
 *
 * Le texte reste modifiable avant écriture : une meta description est le
 * genre de phrase qu'un secrétaire de rédaction ajuste toujours d'un mot. Le
 * compteur passe au rouge au-delà de la limite, et la route retronque de toute
 * façon côté serveur — la contrainte ne dépend pas de ce champ.
 */
export function MetaDescriptionSection({ entry }: { entry: EntryRef }) {
	const task = useAsyncTask<GenerateOutput>();
	const apply = useAsyncTask<void>();
	const [draft, setDraft] = useState("");

	async function handleGenerate() {
		apply.reset();
		const output = await task.run(() =>
			generate({ collection: entry.collection, id: entry.id, action: "metaDescription" }),
		);
		if (output?.result.action === "metaDescription") setDraft(output.result.description);
	}

	async function handleApply() {
		await apply.run(async () => {
			await applySeo({ collection: entry.collection, id: entry.id, description: draft.trim() });
		});
		if (!apply.error) {
			apply.announce(
				"Meta description écrite dans le panneau SEO. Rechargez l'éditeur pour la voir.",
			);
		}
	}

	return (
		<Section
			title="Meta description"
			hint={`Une phrase, ${META_DESCRIPTION_MAX} caractères maximum.`}
		>
			<div className={styles.row}>
				<Button onClick={handleGenerate} disabled={task.busy} variant="primary">
					{task.busy ? "Rédaction…" : draft ? "Régénérer" : "Rédiger la meta description"}
				</Button>
			</div>

			{task.error && <Status tone="error">{task.error}</Status>}

			{(draft || task.data) && (
				<>
					<textarea
						className={styles.textarea}
						value={draft}
						rows={3}
						aria-label="Meta description proposée"
						onChange={(event) => setDraft(event.target.value)}
					/>

					<div className={styles.row}>
						<Counter value={draft.trim().length} max={META_DESCRIPTION_MAX} />
						<Button
							onClick={handleApply}
							disabled={apply.busy || !draft.trim()}
							variant="primary"
						>
							{apply.busy ? "Écriture…" : "Écrire dans le panneau SEO"}
						</Button>
						<Button onClick={() => copyToClipboard(draft)} disabled={!draft.trim()}>
							Copier
						</Button>
					</div>

					{task.data && (
						<p className={styles.hint}>
							{`Analysé sur la ${formatVersion(task.data.updatedAt)}.`}
						</p>
					)}
				</>
			)}

			{apply.error && <Status tone="error">{apply.error}</Status>}
			{apply.notice && <Status tone="success">{apply.notice}</Status>}
		</Section>
	);
}

export default MetaDescriptionSection;
