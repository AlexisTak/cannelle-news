import { useEffect, useState } from "react";
import type { Prompts } from "../../domain/prompts";
import { errorMessage, fetchPrompts, savePrompts, type PromptsOutput } from "../api";
import { Button } from "../components/Primitives";
import styles from "../styles/Assistant.module.css";

/**
 * Page d'édition des prompts de fond.
 *
 * Séparée du formulaire de réglages auto-généré, qui gère les clés et le
 * fournisseur : `settingsSchema` ne sait produire que des champs simples, et
 * quatre consignes de dix lignes chacune demandent des zones de texte hautes,
 * un bouton « Réinitialiser » par prompt et l'affichage du défaut d'usine.
 *
 * Composant sans props : `PluginAdminModule` monte les pages de plugin comme
 * des `ComponentType` nus (`@emdash-cms/admin/dist/index.d.ts:76`).
 */
const FIELDS: Array<{ key: keyof Prompts; label: string; hint: string }> = [
	{ key: "seoTitles", label: "Titres SEO", hint: "Doit produire un tableau JSON de 5 chaînes." },
	{ key: "tldr", label: "TL;DR", hint: "Doit produire un tableau JSON de 3 chaînes." },
	{
		key: "metaDescription",
		label: "Meta description",
		hint: 'Doit produire { "description": "…" }.',
	},
	{ key: "vulgarize", label: "Vulgarisation", hint: 'Doit produire { "text": "…" }.' },
];

export function PromptsPage() {
	const [state, setState] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [busy, setBusy] = useState(false);
	const [server, setServer] = useState<PromptsOutput | null>(null);
	const [draft, setDraft] = useState<Prompts | null>(null);

	useEffect(() => {
		let cancelled = false;

		fetchPrompts()
			.then((output) => {
				if (cancelled) return;
				setServer(output);
				setDraft(output.prompts);
				setState("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(errorMessage(err));
				setState("error");
			});

		return () => {
			cancelled = true;
		};
	}, []);

	async function persist(patch: Partial<Prompts>, message: string) {
		setBusy(true);
		setError("");
		setNotice("");
		try {
			const output = await savePrompts(patch);
			setServer(output);
			setDraft(output.prompts);
			setNotice(message);
		} catch (err: unknown) {
			setError(errorMessage(err));
		} finally {
			setBusy(false);
		}
	}

	if (state === "loading") {
		return (
			<p className={styles.status} role="status">
				Chargement…
			</p>
		);
	}

	if (state === "error" || !draft || !server) {
		return (
			<p className={styles.status} data-tone="error" role="alert">
				{error || "Erreur inconnue"}
			</p>
		);
	}

	const dirty = FIELDS.some(({ key }) => draft[key] !== server.prompts[key]);

	return (
		<div className={styles.root}>
			<h1 className={styles.label}>Prompts de l'assistant IA</h1>
			<p className={styles.hint}>
				Consignes système envoyées au modèle avant chaque action. Les limites dures — cinq
				titres, trois puces, 155 caractères — sont réappliquées en code après la réponse :
				les modifier ici n'y change rien.
			</p>

			{FIELDS.map(({ key, label, hint }) => {
				const overridden = server.overridden.includes(key);
				return (
					<section className={styles.section} key={key}>
						<div className={styles.sectionHeader}>
							<span className={styles.sectionTitle}>{label}</span>
							<span className={styles.hint}>{overridden ? "personnalisé" : "défaut"}</span>
						</div>
						<p className={styles.hint}>{hint}</p>
						<textarea
							className={styles.textarea}
							value={draft[key]}
							rows={8}
							aria-label={`Prompt ${label}`}
							onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
						/>
						{overridden && (
							<div className={styles.row}>
								<Button
									onClick={() => persist({ [key]: "" }, `Prompt « ${label} » réinitialisé.`)}
									disabled={busy}
									title="Revenir au prompt d'usine"
								>
									Réinitialiser
								</Button>
							</div>
						)}
					</section>
				);
			})}

			<div className={styles.row}>
				<Button
					onClick={() => persist(draft, "Prompts enregistrés.")}
					disabled={busy || !dirty}
					variant="primary"
				>
					{busy ? "Enregistrement…" : "Enregistrer"}
				</Button>
				<Button onClick={() => setDraft(server.prompts)} disabled={busy || !dirty}>
					Annuler
				</Button>
			</div>

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
		</div>
	);
}

export default PromptsPage;
