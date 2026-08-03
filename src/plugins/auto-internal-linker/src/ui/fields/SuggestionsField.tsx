import { useEffect, useMemo, useState } from "react";
import { EMPTY_FIELD_VALUE, type LinkerFieldValue } from "../../domain/suggestion";
import type { Suggestion } from "../../domain/suggestion";
import { readEntryRef } from "../entry-ref";
import { errorMessage, fetchLinkerSettings, fetchSuggestions, rebuildIndex } from "../api";
import { Button, formatVersion, Section, Status, useAsyncTask } from "../components/Primitives";
import styles from "../styles/Linker.module.css";

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

export function SuggestionsField({ value, onChange, label, id }: PluginFieldProps) {
	const [entry] = useState(() => readEntryRef());
	const fieldValue = useMemo(() => readFieldValue(value), [value]);
	const [draft, setDraft] = useState(fieldValue);
	const [output, setOutput] = useState<{
		suggestions: Suggestion[];
		indexEmpty: boolean;
		analyzedAt: string;
	} | null>(null);
	const task = useAsyncTask<{
		suggestions: Suggestion[];
		indexEmpty: boolean;
		analyzedAt: string;
	}>();

	// Synchronise le draft quand la valeur externe change (premier montage ou
	// retour arrière dans l'éditeur).
	useEffect(() => {
		setDraft(readFieldValues(value));
	}, [value]);

	async function analyze() {
		if (!entry) return;
		const result = await task.run(() => fetchSuggestions({ collection: entry.collection, id: entry.id }));
		if (result) {
			setOutput(result);
			// Nouvelles suggestions : on coche par défaut celles qui ne sont pas
			// déjà ignorées et qui ne correspondent pas à un lien déjà accepté.
			const acceptedIds = new Set(draft.accepted.map((a) => a.targetId));
			const freshlyAccepted = result.suggestions
				.filter((s) => !draft.ignored.includes(s.normalized) && !acceptedIds.has(s.targetId))
				.map((s) => ({ keyword: s.keyword, targetId: s.targetId, targetUrl: s.targetUrl }));
			setDraft((prev) => ({
				...prev,
				accepted: mergeAccepted(prev.accepted, freshlyAccepted),
			}));
		}
	}

	function toggleSuggestion(suggestion: Suggestion, checked: boolean) {
		setDraft((prev) => {
			const accepted = prev.accepted.filter((a) => a.targetId !== suggestion.targetId);
			if (checked) {
				accepted.push({
					keyword: suggestion.keyword,
					targetId: suggestion.targetId,
					targetUrl: suggestion.targetUrl,
				});
			}
			const ignored = prev.ignored.filter((n) => n !== suggestion.normalized);
			return { ...prev, accepted, ignored };
		});
	}

	function ignoreSuggestion(suggestion: Suggestion) {
		setDraft((prev) => ({
			...prev,
			accepted: prev.accepted.filter((a) => a.targetId !== suggestion.targetId),
			ignored: [...new Set([...prev.ignored, suggestion.normalized])],
		}));
	}

	function validateAll() {
		setDraft((prev) => ({
			...prev,
			accepted: mergeAccepted(
				prev.accepted,
				(output?.suggestions ?? []).map((s) => ({
					keyword: s.keyword,
					targetId: s.targetId,
					targetUrl: s.targetUrl,
				})),
			),
			ignored: prev.ignored.filter(
				(n) => !(output?.suggestions ?? []).some((s) => s.normalized === n),
			),
		}));
	}

	function ignoreAll() {
		setDraft((prev) => {
			const ignored = new Set(prev.ignored);
			for (const s of output?.suggestions ?? []) ignored.add(s.normalized);
			return {
				...prev,
				accepted: prev.accepted.filter(
					(a) => !(output?.suggestions ?? []).some((s) => s.targetId === a.targetId),
				),
				ignored: [...ignored],
			};
		});
	}

	function setManualKeywords(raw: string) {
		setDraft((prev) => ({
			...prev,
			manualKeywords: raw
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean),
		}));
	}

	function persist() {
		onChange(draft);
	}

	const changed = JSON.stringify(draft) !== JSON.stringify(fieldValue);

	return (
		<div className={styles.root}>
			<span className={styles.label} id={id}>{label ?? "Liens internes"}</span>

			{!entry && (
				<Status tone="info">
					Enregistrez l'article une première fois pour activer les suggestions.
				</Status>
			)}

			{entry && (
				<Section
					title="Suggestions"
					hint={
						task.data
							? `Analysé sur la ${formatVersion(task.data.analyzedAt)}. Les liens validés seront posés à l'enregistrement.`
							: "Cliquez sur Analyser pour charger les suggestions depuis la dernière version enregistrée."
					}
				>
					<div className={styles.row}>
						<Button onClick={analyze} disabled={task.busy} variant="primary">
							{task.busy ? "Analyse…" : output ? "Réanalyser" : "Analyser"}
						</Button>
						{output?.indexEmpty && (
							<Button onClick={() => void rebuildAndAnalyze(task, setOutput)} disabled={task.busy}>
								Reconstruire l'index
							</Button>
						)}
					</div>

					{task.error && <Status tone="error">{task.error}</Status>}

					{output && output.suggestions.length === 0 && !output.indexEmpty && (
						<p className={styles.empty}>Aucune suggestion pour cet article.</p>
					)}

					{output?.indexEmpty && (
						<Status tone="info">
							L'index est vide. Reconstruisez-le pour obtenir des suggestions.
						</Status>
					)}

					{output && output.suggestions.length > 0 && (
						<>
							<ul className={styles.suggestions}>
								{output.suggestions.map((suggestion) => {
									const checked = draft.accepted.some(
										(a) => a.targetId === suggestion.targetId,
									);
									return (
										<li className={styles.suggestion} key={suggestion.targetId}>
											<input
												type="checkbox"
												id={`${id}-${suggestion.targetId}`}
												checked={checked}
												onChange={(event) => toggleSuggestion(suggestion, event.target.checked)}
												aria-describedby={`${id}-${suggestion.targetId}-ctx`}
											/>
											<div className={styles.suggestionBody}>
												<label
													className={styles.suggestionText}
													htmlFor={`${id}-${suggestion.targetId}`}
												>
													Créer un lien sur le terme <strong>« {suggestion.keyword} »</strong>
													vers <strong>{suggestion.targetTitle}</strong>
												</label>
												<p
													id={`${id}-${suggestion.targetId}-ctx`}
													className={styles.context}
													dangerouslySetInnerHTML={{
														__html: highlightContext(suggestion.context, suggestion.keyword),
													}}
												/>
											</div>
										</li>
									);
									})}
								</ul>
								<div className={styles.row}>
									<Button onClick={validateAll} disabled={task.busy}>Tout valider</Button>
									<Button onClick={ignoreAll} disabled={task.busy}>Tout ignorer</Button>
								</div>
							</>
						)}
					</Section>
				)}

			<Section title="Mots-clés de cet article" hint="Séparés par des virgules. Ils pointeront vers cet article depuis les autres.">
				<textarea
					className={styles.textarea}
					value={draft.manualKeywords.join(", ")}
					rows={2}
					onChange={(event) => setManualKeywords(event.target.value)}
				/>
			</Section>

			{entry && changed && (
				<div className={styles.row}>
					<Button onClick={persist} variant="primary">
						Enregistrer les choix
					</Button>
					<Button onClick={() => setDraft(fieldValue)}>Annuler</Button>
				</div>
			)}
		</div>
	);
}

async function rebuildAndAnalyze(
	task: ReturnType<typeof useAsyncTask>,
	setOutput: React.Dispatch<
		React.SetStateAction<{
			suggestions: Suggestion[];
			indexEmpty: boolean;
			analyzedAt: string;
		} | null>
	&gt;,
) {
	task.reset();
	const rebuild = await task.run(() => rebuildIndex());
	if (!rebuild) return;
	const entry = readEntryRef();
	if (!entry) return;
	const result = await task.run(() => fetchSuggestions({ collection: entry.collection, id: entry.id }));
	if (result) setOutput(result);
}

function mergeAccepted(
	existing: LinkerFieldValue["accepted"],
	fresh: LinkerFieldValue["accepted"],
): LinkerFieldValue["accepted"] {
	const map = new Map(existing.map((a) => [a.targetId, a]));
	for (const item of fresh) map.set(item.targetId, item);
	return [...map.values()];
}

function readFieldValues(raw: unknown): LinkerFieldValue {
	const value =
		raw && typeof raw === "object"
			? ({
					version: 1,
					manualKeywords: (raw as LinkerFieldValue).manualKeywords ?? [],
					accepted: (raw as LinkerFieldValue).accepted ?? [],
					ignored: (raw as LinkerFieldValue).ignored ?? [],
				} as LinkerFieldValue)
			: EMPTY_FIELD_VALUE;
	return {
		...value,
		manualKeywords: value.manualKeywords.filter((k) => typeof k === "string" && k.trim()),
		accepted: value.accepted.filter(
			(a) => typeof a.keyword === "string" && typeof a.targetId === "string" && typeof a.targetUrl === "string",
		),
		ignored: value.ignored.filter((i) => typeof i === "string" && i.trim()),
	};
}

function readFieldValue(raw: unknown): LinkerFieldValue {
	return readFieldValues(raw);
}

/**
 * Surligne le terme dans le contexte brut. Le contexte contient déjà des
 * points de suspension ; on évite `dangerouslySetInnerHTML` en renvoyant des
 * fragments React, où chaque partie de texte reste du texte pur.
 */
function highlightContext(context: string, keyword: string): React.ReactNode {
	if (!keyword) return context;
	const normalized = keyword.toLowerCase();
	const index = context.toLowerCase().indexOf(normalized);
	if (index === -1) return context;
	const before = context.slice(0, index);
	const match = context.slice(index, index + keyword.length);
	const after = context.slice(index + keyword.length);
	return (
		<>
			{before}
			<mark>{match}</mark>
			{after}
		</>
	);
}

export default SuggestionsField;
