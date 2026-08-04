import { useState } from "react";
import { fetchParagraphs, generate, type GenerateOutput, type ParagraphsOutput } from "../../api";
import {
	Button,
	Section,
	Status,
	copyToClipboard,
	useAsyncTask,
} from "../../components/Primitives";
import type { EntryRef } from "../../entry-ref";
import styles from "../../styles/Assistant.module.css";

/**
 * « Vulgariser la sélection ».
 *
 * EmDash n'expose aucune API de sélection dans l'éditeur Portable Text : un
 * widget de champ ne voit ni le curseur, ni le texte sélectionné. Le passage
 * est donc désigné autrement — choisi dans la liste des paragraphes de la
 * version enregistrée, ou collé à la main.
 *
 * La reformulation n'est pas réinjectée dans le corps : écrire dans `content`
 * écraserait le brouillon ouvert dans l'éditeur. Le rédacteur copie et
 * remplace lui-même, ce qui lui laisse aussi le contrôle du passage exact.
 */
export function VulgarizeSection({ entry }: { entry: EntryRef }) {
	const list = useAsyncTask<ParagraphsOutput>();
	const task = useAsyncTask<GenerateOutput>();
	const [selected, setSelected] = useState<number | null>(null);
	const [pasted, setPasted] = useState("");

	const paragraphs = list.data?.items ?? [];
	const result = task.data?.result.action === "vulgarize" ? task.data.result : null;
	const canGenerate = selected !== null || pasted.trim().length > 0;

	async function handleLoad() {
		const output = await list.run(() => fetchParagraphs(entry.collection, entry.id));
		setSelected(output?.items[0]?.index ?? null);
	}

	async function handleGenerate() {
		await task.run(() =>
			generate({
				collection: entry.collection,
				id: entry.id,
				action: "vulgarize",
				// Un passage collé prime sur la sélection : c'est le geste le plus
				// explicite des deux.
				...(pasted.trim() ? { text: pasted.trim() } : { paragraphIndex: selected ?? 0 }),
			}),
		);
	}

	return (
		<Section
			title="Vulgariser un passage"
			hint="Choisissez un paragraphe de la version enregistrée, ou collez le passage à reformuler."
		>
			<div className={styles.row}>
				<Button onClick={handleLoad} disabled={list.busy}>
					{list.busy ? "Chargement…" : paragraphs.length ? "Recharger les paragraphes" : "Charger les paragraphes"}
				</Button>
			</div>

			{list.error && <Status tone="error">{list.error}</Status>}
			{list.data && paragraphs.length === 0 && (
				<Status tone="info">Aucun paragraphe assez long dans la version enregistrée.</Status>
			)}

			{paragraphs.length > 0 && (
				<select
					className={styles.select}
					aria-label="Paragraphe à vulgariser"
					value={selected ?? ""}
					onChange={(event) => {
						setSelected(Number(event.target.value));
						setPasted("");
					}}
				>
					{paragraphs.map((paragraph) => (
						<option key={paragraph.index} value={paragraph.index}>
							{`${paragraph.preview} (${paragraph.chars} car.)`}
						</option>
					))}
				</select>
			)}

			<textarea
				className={styles.textarea}
				value={pasted}
				rows={3}
				aria-label="Passage collé à vulgariser"
				placeholder="… ou collez ici le passage technique"
				onChange={(event) => setPasted(event.target.value)}
			/>

			<div className={styles.row}>
				<Button onClick={handleGenerate} disabled={task.busy || !canGenerate} variant="primary">
					{task.busy ? "Reformulation…" : "Vulgariser"}
				</Button>
			</div>

			{task.error && <Status tone="error">{task.error}</Status>}

			{result && (
				<>
					<p className={styles.result}>{result.text}</p>
					<div className={styles.row}>
						<Button onClick={() => copyToClipboard(result.text)}>Copier</Button>
						<span className={styles.counter}>
							{`${result.sourceText.length} → ${result.text.length} car.`}
						</span>
					</div>
					<p className={styles.hint}>
						Collez la reformulation dans l'article à la place du passage d'origine.
					</p>
				</>
			)}
		</Section>
	);
}

export default VulgarizeSection;
