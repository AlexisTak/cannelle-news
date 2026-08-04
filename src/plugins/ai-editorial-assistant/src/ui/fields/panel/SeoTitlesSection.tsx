import { useState } from "react";
import { SEO_TITLE_COUNT } from "../../../domain/actions";
import { applySeo, generate, type GenerateOutput } from "../../api";
import {
	Button,
	Section,
	Status,
	copyToClipboard,
	formatVersion,
	useAsyncTask,
} from "../../components/Primitives";
import type { EntryRef } from "../../entry-ref";
import styles from "../../styles/Assistant.module.css";

/**
 * « Générer 5 titres SEO ».
 *
 * Le titre retenu est écrit dans le **panneau SEO natif**, pas dans le champ
 * `title` de l'article : ce sont deux choses différentes — l'un est le titre
 * de la page dans les résultats de recherche, l'autre le titre éditorial —
 * et seule la clé `seo` peut être écrite sans risquer d'écraser le brouillon
 * en cours dans l'éditeur.
 */
export function SeoTitlesSection({ entry }: { entry: EntryRef }) {
	const task = useAsyncTask<GenerateOutput>();
	const apply = useAsyncTask<void>();
	const [selected, setSelected] = useState(0);

	const titles = task.data?.result.action === "seoTitles" ? task.data.result.titles : [];
	const chosen = titles[selected] ?? "";

	async function handleGenerate() {
		setSelected(0);
		apply.reset();
		await task.run(() =>
			generate({ collection: entry.collection, id: entry.id, action: "seoTitles" }),
		);
	}

	async function handleApply() {
		await apply.run(async () => {
			await applySeo({ collection: entry.collection, id: entry.id, title: chosen });
		});
		if (!apply.error) {
			apply.announce("Titre écrit dans le panneau SEO. Rechargez l'éditeur pour le voir.");
		}
	}

	return (
		<Section
			title={`${SEO_TITLE_COUNT} titres SEO`}
			hint="Propositions calculées sur la dernière version enregistrée de l'article."
		>
			<div className={styles.row}>
				<Button onClick={handleGenerate} disabled={task.busy} variant="primary">
					{task.busy ? "Génération…" : titles.length ? "Régénérer" : "Générer 5 titres SEO"}
				</Button>
			</div>

			{task.error && <Status tone="error">{task.error}</Status>}

			{titles.length > 0 && (
				<>
					<ul className={styles.proposals}>
						{titles.map((title, index) => (
							<li key={title}>
								<label className={styles.proposal} data-selected={index === selected}>
									<input
										type="radio"
										name="ai-seo-title"
										checked={index === selected}
										onChange={() => setSelected(index)}
									/>
									<span className={styles.proposalText}>{title}</span>
									<span className={styles.counter}>{title.length}</span>
								</label>
							</li>
						))}
					</ul>

					<div className={styles.row}>
						<Button onClick={handleApply} disabled={apply.busy || !chosen} variant="primary">
							{apply.busy ? "Écriture…" : "Écrire dans le panneau SEO"}
						</Button>
						<Button
							onClick={() => copyToClipboard(chosen)}
							disabled={!chosen}
							title="Copier le titre sélectionné"
						>
							Copier
						</Button>
					</div>

					<p className={styles.hint}>
						{`Analysé sur la ${formatVersion(task.data?.updatedAt ?? null)}.`}
					</p>
				</>
			)}

			{apply.error && <Status tone="error">{apply.error}</Status>}
			{apply.notice && <Status tone="success">{apply.notice}</Status>}
		</Section>
	);
}

export default SeoTitlesSection;
