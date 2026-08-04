import { useEffect, useState } from "react";
import type { GlossaryTerm, SaveTermInput } from "../lib/types";
import { apiFetch } from "./api";

export function GlossaryManagerPage() {
	const [terms, setTerms] = useState<GlossaryTerm[]>([]);
	const [draft, setDraft] = useState<SaveTermInput>({
		term: "",
		definition: "",
		fullUrl: "",
		aliases: [],
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await apiFetch<{ terms: GlossaryTerm[] }>("terms/list", {});
			setTerms(res.terms);
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
		try {
			const saved = await apiFetch<{ term: GlossaryTerm }>("terms/save", {
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
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur");
		}
	}

	async function remove(id: string) {
		if (!confirm("Supprimer ce terme ? Les articles l'utilisant conserveront la mark mais perdront l'infobulle jusqu'à mise à jour.")) return;
		try {
			await apiFetch("terms/delete", { id });
			setTerms((prev) => prev.filter((t) => t.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur");
		}
	}

	return (
		<div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
			<h1 style={{ fontSize: "1.5rem", marginBottom: 16 }}>Glossaire</h1>

			{error && <p style={{ color: "#dc2626" }}>{error}</p>}

			<form onSubmit={save} style={{ marginBottom: 32 }}>
				<label style={{ display: "block", marginBottom: 12 }}>
					Terme
					<input
						style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
						value={draft.term}
						onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
						required
						maxLength={120}
					/>
				</label>

				<label style={{ display: "block", marginBottom: 12 }}>
					Définition courte
					<textarea
						style={{ display: "block", width: "100%", marginTop: 4, padding: 8, minHeight: 80 }}
						value={draft.definition}
						onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))}
						required
						maxLength={2000}
					/>
				</label>

				<label style={{ display: "block", marginBottom: 12 }}>
					Lien complet (optionnel)
					<input
						style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
						value={draft.fullUrl ?? ""}
						onChange={(e) => setDraft((d) => ({ ...d, fullUrl: e.target.value || null }))}
						placeholder="/glossaire/llm ou https://..."
					/>
				</label>

				<label style={{ display: "block", marginBottom: 12 }}>
					Alias (séparés par des virgules)
					<input
						style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
						value={draft.aliases?.join(", ") ?? ""}
						onChange={(e) =>
							setDraft((d) => ({
								...d,
								aliases: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
							}))
						}
					/>
				</label>

				<button type="submit" style={{ padding: "8px 16px" }}>Ajouter / Mettre à jour</button>
			</form>

			{loading ? (
				<p>Chargement…</p>
			) : (
				<ul style={{ listStyle: "none", padding: 0 }}>
					{terms.map((t) => (
						<li
							key={t.id}
							style={{
								borderBottom: "1px solid #e5e7eb",
								padding: "12px 0",
							}}
						>
							<strong>{t.term}</strong>
							{t.fullUrl && (
								<span style={{ marginLeft: 8 }}>
									— <a href={t.fullUrl}>{t.fullUrl}</a>
								</span>
							)}
							<p style={{ margin: "4px 0", color: "#4b5563" }}>{t.definition}</p>
							{t.aliases.length > 0 && (
								<p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
									Alias : {t.aliases.join(", ")}
								</p>
							)}
							<button onClick={() => remove(t.id)} style={{ fontSize: "0.85rem" }}>
								Supprimer
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
