import { useState } from "react";
import { TLDR_BULLET_COUNT } from "../../domain/actions";
import { generate, type GenerateOutput } from "../api";
import { Button, Section, Status, formatVersion, useAsyncTask } from "../components/Primitives";
import { readEntryRef } from "../entry-ref";
import styles from "../styles/Assistant.module.css";

/**
 * Props d'un widget de champ EmDash.
 *
 * Sept props, rien de plus (`@emdash-cms/admin/dist/index.js:14465`) : ni les
 * champs voisins, ni le corps de l'article, ni l'identifiant de l'entrée. D'où
 * `readEntryRef()` pour l'entrée et une lecture serveur pour le contenu.
 */
export interface PluginFieldProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label?: string;
	id?: string;
	required?: boolean;
	minimal?: boolean;
}

/**
 * Champ TL;DR : trois puces générées puis éditables.
 *
 * La valeur stockée est un simple `string[]` — pas d'objet enveloppe, pas de
 * métadonnée de génération. Désinstaller le plugin laisse ainsi un contenu
 * parfaitement valide, et le rendu Astro n'a rien à déballer.
 *
 * L'insertion est un vrai `onChange` : la valeur rejoint le formulaire de
 * l'éditeur et part avec le Save normal. C'est le seul endroit du plugin où
 * l'écriture ne peut rien casser, puisque le widget n'écrit que son propre champ.
 */
export function TldrField({ value, onChange, label, id }: PluginFieldProps) {
	const [entry] = useState(() => readEntryRef());
	const task = useAsyncTask<GenerateOutput>();
	const bullets = normalizeBullets(value);
	const filled = bullets.filter((b) => b.trim()).length;

	async function handleGenerate() {
		if (!entry) return;
		const output = await task.run(() =>
			generate({ collection: entry.collection, id: entry.id, action: "tldr" }),
		);
		if (output?.result.action === "tldr") onChange(output.result.bullets);
	}

	function handleBulletChange(index: number, text: string) {
		const next = [...bullets];
		next[index] = text;
		// Un TL;DR entièrement vidé à la main doit remettre le champ à `null`,
		// sinon l'article publierait un encadré de trois chaînes vides.
		onChange(next.some((b) => b.trim()) ? next : null);
	}

	return (
		<div className={styles.root}>
			<span className={styles.label} id={id}>
				{label ?? "TL;DR"}
			</span>

			<Section
				title="Trois points clés"
				hint={
					entry
						? "Généré depuis la dernière version enregistrée de l'article, puis modifiable à la main."
						: undefined
				}
			>
				{!entry && (
					<Status tone="info">
						Enregistrez l'article une première fois pour activer la génération.
					</Status>
				)}

				<div className={styles.bullets}>
					{bullets.map((bullet, index) => (
						<div className={styles.bullet} key={index}>
							<span className={styles.bulletIndex} aria-hidden="true">
								{index + 1}
							</span>
							<textarea
								className={styles.textarea}
								value={bullet}
								rows={2}
								aria-label={`Point clé ${index + 1}`}
								placeholder={`Point clé ${index + 1}`}
								onChange={(event) => handleBulletChange(index, event.target.value)}
							/>
						</div>
					))}
				</div>

				<div className={styles.row}>
					<Button onClick={handleGenerate} disabled={!entry || task.busy} variant="primary">
						{task.busy ? "Génération…" : filled ? "Régénérer le TL;DR" : "Créer le TL;DR"}
					</Button>
					{filled > 0 && (
						<Button onClick={() => onChange(null)} disabled={task.busy}>
							Vider
						</Button>
					)}
				</div>

				{task.error && <Status tone="error">{task.error}</Status>}
				{task.data && !task.error && (
					<Status tone="success">
						{`Inséré depuis la ${formatVersion(task.data.updatedAt)} — ${task.data.model}. Enregistrez l'article pour conserver ces puces.`}
					</Status>
				)}
			</Section>
		</div>
	);
}

/** Toujours exactement trois emplacements, quelle que soit la valeur stockée. */
function normalizeBullets(value: unknown): string[] {
	const source = Array.isArray(value) ? value : [];
	return Array.from({ length: TLDR_BULLET_COUNT }, (_, index) => {
		const item = source[index];
		return typeof item === "string" ? item : "";
	});
}

export default TldrField;
