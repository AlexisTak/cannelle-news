import { useEffect, useState } from "react";
import type { GlossaryTerm, SaveTermInput } from "../lib/types";
import { apiFetch } from "./api";
import { Button, Field, Section, Status } from "./components/Primitives";
import styles from "./styles/Glossary.module.css";

/**
 * Page de gestion du glossaire.
 *
 * Composant sans props : `PluginAdminModule` monte les pages de plugin comme
 * des `ComponentType` nus.
 */
export function GlossaryManagerPage() {
	const [terms, setTerms] = useState<GlossaryTerm[]>([]);
	const [draft, setDraft] = useState<SaveTermInput>({
		term: "",
		definition: "",
		fullUrl: "",
		aliases: [],
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await apiFetch<{ terms: GlossaryTerm[] }>("terms/list", {});
			// `apiFetch` renvoie un `as T` non validé : garde-fou si la route
			// change de forme, sinon `terms.map` casse le rendu entier.
			setTerms(res.terms ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		try {
			const saved = await apiFetch<{ term: GlossaryTerm }>("terms/save", {
				id: editingId ?? undefined,
				term: draft.term,
				definition: draft.definition,
				fullUrl: draft.fullUrl || null,
				aliases: draft.aliases,
			});
			setTerms((prev) => {
				const next = prev.filter((t) => t.id !== saved.term.id);
				next.unshift(saved.term);
				return next;
			});
			setDraft({ term: "", definition: "", fullUrl: "", aliases: [] });
			setEditingId(null);
			setNotice(`« ${saved.term.term} » ${editingId ? "mis à jour" : "enregistré"}.`);
		} catch (err) {
			setNotice(null);
			setError(err instanceof Error ? err.message : "Erreur");
		}
	}

	function startEdit(term: GlossaryTerm) {
		setDraft({
			term: term.term,
			definition: term.definition,
			fullUrl: term.fullUrl ?? "",
			aliases: term.aliases,
		});
		setEditingId(term.id);
		setNotice(null);
		setError(null);
	}

	function cancelEdit() {
		setDraft({ term: "", definition: "", fullUrl: "", aliases: [] });
		setEditingId(null);
		setNotice(null);
		setError(null);
	}

	async function remove(id: string) {
		if (!confirm("Supprimer ce terme ? Les articles l'utilisant conserveront la mark mais perdront l'infobulle jusqu'à mise à jour.")) return;
		try {
			await apiFetch("terms/delete", { id });
			setTerms((prev) => prev.filter((t) => t.id !== id));
			setNotice("Terme supprimé.");
		} catch (err) {
			setNotice(null);
			setError(err instanceof Error ? err.message : "Erreur");
		}
	}

	return (
		<div className={styles.root}>
			<h1 className={styles.title}>Glossaire</h1>
			<p className={styles.hint}>
				Les termes définis ici alimentent les infobulles des articles et le JSON-LD
				<code> DefinedTerm</code> injecté dans les pages. Un terme supprimé ne casse pas
				les articles : la mark reste, seule l'infobulle disparaît.
			</p>

			<Section
				title={editingId ? "Modifier le terme" : "Nouveau terme"}
				hint="Réutiliser un terme existant à l'identique met à jour sa fiche au lieu d'en créer une seconde."
			>
				<form onSubmit={save} className={styles.form}>
					<Field
						label="Terme"
						hint="Forme canonique affichée dans l'infobulle et dans le JSON-LD. Sert aussi à générer l'identifiant du terme."
					>
						<input
							className={styles.input}
							value={draft.term}
							onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
							required
							maxLength={120}
							placeholder="LLM"
						/>
					</Field>

					<Field
						label="Définition courte"
						hint="Texte de l'infobulle, une à deux phrases. Repris tel quel comme description du JSON-LD. 2000 caractères max."
					>
						<textarea
							className={styles.textarea}
							value={draft.definition}
							onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))}
							required
							maxLength={2000}
							placeholder="Modèle de langage entraîné sur de grands corpus de texte…"
						/>
					</Field>

					<Field
						label="Lien complet (optionnel)"
						hint="Page de référence ouverte depuis l'infobulle. Chemin interne ou URL absolue. Vide : infobulle seule, sans lien."
					>
						<input
							className={styles.input}
							value={draft.fullUrl ?? ""}
							onChange={(e) => setDraft((d) => ({ ...d, fullUrl: e.target.value || null }))}
							placeholder="/glossaire/llm ou https://…"
						/>
					</Field>

					<Field
						label="Alias (optionnel)"
						hint="Déclinaisons renvoyant à la même définition : pluriels, acronymes, abréviations. Séparés par des virgules, 20 max."
					>
						<input
							className={styles.input}
							value={draft.aliases?.join(", ") ?? ""}
							onChange={(e) =>
								setDraft((d) => ({
									...d,
									aliases: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
								}))
							}
							placeholder="LLMs, grand modèle de langage"
						/>
					</Field>

					<div className={styles.row}>
						<Button type="submit" variant="primary">{editingId ? "Mettre à jour" : "Ajouter"}</Button>
						{editingId && (
							<Button type="button" variant="secondary" onClick={cancelEdit}>Annuler</Button>
						)}
					</div>
				</form>
			</Section>

			{error && <Status tone="error">{error}</Status>}
			{notice && <Status tone="success">{notice}</Status>}

			<Section
				title={`Termes enregistrés${terms.length > 0 ? ` (${terms.length})` : ""}`}
				hint="Chaque terme est reconnu dans l'éditeur via sa forme canonique ou l'un de ses alias."
			>
				{loading ? (
					<p className={styles.status} role="status">Chargement…</p>
				) : terms.length === 0 ? (
					<p className={styles.empty}>Aucun terme pour l'instant.</p>
				) : (
					<ul className={styles.list}>
						{terms.map((t) => (
							<li key={t.id} className={styles.item}>
								<div className={styles.itemHeader}>
									<span className={styles.itemTerm}>{t.term}</span>
									<div className={styles.itemActions}>
										<Button variant="secondary" onClick={() => startEdit(t)}>Modifier</Button>
										<Button variant="danger" onClick={() => remove(t.id)}>Supprimer</Button>
									</div>
								</div>
								<p className={styles.definition}>{t.definition}</p>
								{t.fullUrl && (
									<a className={styles.link} href={t.fullUrl}>{t.fullUrl}</a>
								)}
								{t.aliases.length > 0 && (
									<div className={styles.tags}>
										{t.aliases.map((alias) => (
											<span className={styles.tag} key={alias}>{alias}</span>
										))}
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</Section>
		</div>
	);
}

export default GlossaryManagerPage;
