import { useEffect, useMemo, useRef, useState } from "react";
import type { GlossaryTerm, SaveTermInput } from "../lib/types";
import { safeHref } from "../lib/safe-href";
import { apiFetch } from "./api";
import styles from "./Glossary.module.css";

/**
 * Page de gestion du glossaire.
 *
 * Composant sans props : `PluginAdminModule` monte les pages de plugin comme
 * des `ComponentType` nus (`@emdash-cms/admin/dist/index.d.ts:76`).
 *
 * L'écran est organisé autour du lexique, pas du formulaire : sélectionner une
 * entrée la charge dans le panneau d'édition. Sans ce chemin, la seule façon de
 * corriger une définition était de retaper le terme à l'identique pour que
 * `slugify` retombe sur le même identifiant — un comportement que rien
 * n'annonçait à l'écran.
 */

/** Limites reprises de `saveTermSchema` : l'UI doit les montrer avant l'envoi. */
const TERM_MAX = 120;
const DEFINITION_MAX = 2000;
const ALIASES_MAX = 20;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Bucket des termes ne commençant ni par une lettre ASCII ni connus. */
const OTHER_BUCKET = "#";

interface Draft {
	term: string;
	definition: string;
	fullUrl: string;
	/** Saisie brute : découpée à l'envoi seulement, pour ne pas gêner la frappe. */
	aliases: string;
}

const EMPTY_DRAFT: Draft = { term: "", definition: "", fullUrl: "", aliases: "" };

/** Repli sur la même normalisation que le store, accents compris. */
function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim();
}

/** Lettre de classement d'un terme : « Élan » se range sous E. */
function bucketOf(term: string): string {
	const first = normalize(term).charAt(0).toUpperCase();
	return LETTERS.includes(first) ? first : OTHER_BUCKET;
}

function toDraft(term: GlossaryTerm): Draft {
	return {
		term: term.term,
		definition: term.definition,
		fullUrl: term.fullUrl ?? "",
		aliases: term.aliases.join(", "),
	};
}

export function GlossaryManagerPage() {
	const [terms, setTerms] = useState<GlossaryTerm[]>([]);
	const [query, setQuery] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const termInputRef = useRef<HTMLInputElement>(null);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await apiFetch<{ terms: GlossaryTerm[] }>("terms/list", {});
			// Garde-fou : une réponse hors contrat ne doit pas faire tomber le
			// rendu sur un `terms.map` d'`undefined` — l'erreur affichée serait
			// alors sans rapport avec sa cause réelle, côté transport.
			setTerms(Array.isArray(res?.terms) ? res.terms : []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Chargement impossible.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	/* ------------------------------------------------------------ dérivés */

	const sorted = useMemo(
		() => [...terms].sort((a, b) => normalize(a.term).localeCompare(normalize(b.term), "fr")),
		[terms],
	);

	const filtered = useMemo(() => {
		const needle = normalize(query);
		if (!needle) return sorted;
		return sorted.filter((t) =>
			[t.term, ...t.aliases, t.definition].some((value) => normalize(value).includes(needle)),
		);
	}, [sorted, query]);

	/** Entrées groupées par lettre, dans l'ordre alphabétique puis « # ». */
	const groups = useMemo(() => {
		const byLetter = new Map<string, GlossaryTerm[]>();
		for (const term of filtered) {
			const bucket = bucketOf(term.term);
			const list = byLetter.get(bucket);
			if (list) list.push(term);
			else byLetter.set(bucket, [term]);
		}
		return [...LETTERS, OTHER_BUCKET]
			.filter((letter) => byLetter.has(letter))
			.map((letter) => ({ letter, items: byLetter.get(letter) as GlossaryTerm[] }));
	}, [filtered]);

	const activeLetters = useMemo(
		() => new Set(groups.map((group) => group.letter)),
		[groups],
	);

	const withoutLink = useMemo(() => terms.filter((t) => !t.fullUrl).length, [terms]);

	const aliasCount = draft.aliases
		.split(",")
		.map((a) => a.trim())
		.filter(Boolean).length;

	/* ------------------------------------------------------------ actions */

	function jumpTo(letter: string) {
		const target = document.getElementById(`glossary-group-${letter}`);
		if (!target) return;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
	}

	function startEdit(term: GlossaryTerm) {
		setEditingId(term.id);
		setDraft(toDraft(term));
		setPendingDelete(null);
		setNotice(null);
		setError(null);
		termInputRef.current?.focus();
	}

	function startNew() {
		setEditingId(null);
		setDraft(EMPTY_DRAFT);
		setPendingDelete(null);
		setNotice(null);
		setError(null);
		termInputRef.current?.focus();
	}

	async function save() {
		const aliases = draft.aliases
			.split(",")
			.map((a) => a.trim())
			.filter(Boolean)
			.slice(0, ALIASES_MAX);

		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			const saved = await apiFetch<{ term: GlossaryTerm }>("terms/save", {
				// `id` n'est transmis qu'en édition : à la création, la route le
				// dérive du terme. L'envoyer permet de renommer une entrée sans
				// rompre les marks déjà posées, qui pointent sur l'identifiant.
				...(editingId ? { id: editingId } : {}),
				term: draft.term.trim(),
				definition: draft.definition.trim(),
				fullUrl: draft.fullUrl.trim() || null,
				aliases,
			} satisfies SaveTermInput as unknown as Record<string, unknown>);

			setTerms((prev) => [saved.term, ...prev.filter((t) => t.id !== saved.term.id)]);
			let rehydrate: { done: boolean; collectionIndex?: number; cursor?: string } = { done: false };
			while (!rehydrate.done) {
				rehydrate = await apiFetch("terms/rehydrate", { termId: saved.term.id, collectionIndex: rehydrate.collectionIndex, cursor: rehydrate.cursor });
			}
			setEditingId(saved.term.id);
			setDraft(toDraft(saved.term));
			setNotice(`« ${saved.term.term} » enregistré.`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Enregistrement impossible.");
		} finally {
			setBusy(false);
		}
	}

	async function remove(term: GlossaryTerm) {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			await apiFetch("terms/delete", { id: term.id });
			setTerms((prev) => prev.filter((t) => t.id !== term.id));
			if (editingId === term.id) startNew();
			setNotice(`« ${term.term} » supprimé.`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Suppression impossible.");
		} finally {
			setPendingDelete(null);
			setBusy(false);
		}
	}

	/* ------------------------------------------------------------- rendu */

	const canSave = draft.term.trim().length > 0 && draft.definition.trim().length > 0 && !busy;

	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<h1 className={styles.title}>Glossaire</h1>
				<p className={styles.tally}>
					<span>
						{terms.length} terme{terms.length > 1 ? "s" : ""}
					</span>
					{withoutLink > 0 && (
						<>
							<span className={styles.tallySeparator} aria-hidden="true">
								·
							</span>
							<span className={styles.tallyGap}>{withoutLink} sans lien</span>
						</>
					)}
				</p>
			</header>

			{error && (
				<p className={styles.status} data-tone="error" role="alert">
					{error}
				</p>
			)}
			{notice && (
				<p className={styles.status} data-tone="success" role="status">
					{notice}
				</p>
			)}

			<div className={styles.body}>
				<nav aria-label="Aller à une lettre">
					<ul className={styles.rail}>
						{[...LETTERS, OTHER_BUCKET].map((letter) => {
							const active = activeLetters.has(letter);
							return (
								<li key={letter}>
									<button
										type="button"
										className={styles.railLetter}
										data-empty={!active}
										onClick={() => active && jumpTo(letter)}
										disabled={!active}
										aria-label={
											active ? `Aller à la lettre ${letter}` : `Aucun terme en ${letter}`
										}
									>
										{letter}
									</button>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className={styles.lexicon}>
					<input
						type="search"
						className={styles.search}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Rechercher un terme, un alias, une définition…"
						aria-label="Rechercher dans le glossaire"
					/>

					{loading ? (
						<p className={styles.empty} role="status">
							Chargement du glossaire…
						</p>
					) : terms.length === 0 ? (
						<p className={styles.empty}>
							<span className={styles.emptyLead}>Le glossaire est vide.</span>
							Définissez un premier terme : il apparaîtra en infobulle dans tous les articles
							qui l'emploient, sans que vous ayez à les rouvrir.
						</p>
					) : filtered.length === 0 ? (
						<p className={styles.empty}>
							<span className={styles.emptyLead}>Aucun terme ne correspond.</span>
							La recherche porte sur les termes, leurs alias et leurs définitions.
						</p>
					) : (
						groups.map((group) => (
							<section
								key={group.letter}
								className={styles.group}
								id={`glossary-group-${group.letter}`}
							>
								<h2 className={styles.groupLabel}>{group.letter}</h2>

								{group.items.map((term) => {
									const href = safeHref(term.fullUrl);
									const confirming = pendingDelete === term.id;

									return (
										<article
											key={term.id}
											className={styles.entry}
											data-editing={editingId === term.id}
										>
											<div className={styles.headword}>
												<span className={styles.term}>{term.term}</span>
												{term.aliases.length > 0 && (
													<span className={styles.variants}>
														{term.aliases.join(" · ")}
													</span>
												)}
												{href ? (
													<a
														className={styles.link}
														href={href}
														target="_blank"
														rel="noopener noreferrer"
													>
														{term.fullUrl}
													</a>
												) : (
													<span className={styles.linkMissing}>sans lien</span>
												)}
											</div>

											<p className={styles.definition}>{term.definition}</p>

											<div className={styles.entryActions}>
												{confirming ? (
													<span className={styles.confirm}>
														Supprimer ?
														<button
															type="button"
															className={styles.button}
															data-variant="danger"
															onClick={() => remove(term)}
															disabled={busy}
														>
															Supprimer
														</button>
														<button
															type="button"
															className={styles.quietButton}
															onClick={() => setPendingDelete(null)}
														>
															Annuler
														</button>
													</span>
												) : (
													<>
														<button
															type="button"
															className={styles.quietButton}
															onClick={() => startEdit(term)}
														>
															Modifier
														</button>
														<button
															type="button"
															className={styles.quietButton}
															data-tone="danger"
															onClick={() => setPendingDelete(term.id)}
														>
															Supprimer
														</button>
													</>
												)}
											</div>
										</article>
									);
								})}
							</section>
						))
					)}
				</div>

				<form
					className={styles.editor}
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<h2 className={styles.editorTitle}>
						{editingId ? "Modifier le terme" : "Nouveau terme"}
					</h2>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>
							Terme
							<span className={styles.counter} data-over={draft.term.length > TERM_MAX}>
								{draft.term.length}/{TERM_MAX}
							</span>
						</span>
						<input
							ref={termInputRef}
							className={styles.input}
							value={draft.term}
							onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
							maxLength={TERM_MAX}
							required
						/>
					</label>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>
							Définition
							<span
								className={styles.counter}
								data-over={draft.definition.length > DEFINITION_MAX}
							>
								{draft.definition.length}/{DEFINITION_MAX}
							</span>
						</span>
						<textarea
							className={styles.textarea}
							value={draft.definition}
							onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))}
							maxLength={DEFINITION_MAX}
							required
						/>
					</label>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>
							Lien complet
							<span className={styles.fieldHint}>facultatif</span>
						</span>
						<input
							className={styles.input}
							value={draft.fullUrl}
							onChange={(e) => setDraft((d) => ({ ...d, fullUrl: e.target.value }))}
							placeholder="/glossaire/llm ou https://…"
						/>
					</label>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>
							Alias
							<span className={styles.counter} data-over={aliasCount > ALIASES_MAX}>
								{aliasCount}/{ALIASES_MAX}
							</span>
						</span>
						<input
							className={styles.input}
							value={draft.aliases}
							onChange={(e) => setDraft((d) => ({ ...d, aliases: e.target.value }))}
							placeholder="Pluriels, sigles, abréviations — séparés par des virgules"
						/>
					</label>

					<div className={styles.editorActions}>
						<button
							type="submit"
							className={styles.button}
							data-variant="primary"
							disabled={!canSave}
						>
							{busy ? "Enregistrement…" : editingId ? "Enregistrer" : "Ajouter le terme"}
						</button>
						{editingId && (
							<button type="button" className={styles.button} onClick={startNew}>
								Nouveau terme
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
