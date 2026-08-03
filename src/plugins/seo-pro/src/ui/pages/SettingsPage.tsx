import { useEffect, useState } from "react";
import styles from "../styles/EntryReport.module.css";
import { PageShell, LoadingState, ErrorState } from "../components/PageShell";
import { fetchSeoConfig, saveSeoConfig } from "../api";

export function SettingsPage() {
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);
	const [busy, setBusy] = useState(false);

	const [wordsPerMinute, setWordsPerMinute] = useState(200);
	const [siteUrl, setSiteUrl] = useState("");
	const [collections, setCollections] = useState("posts, pages");

	useEffect(() => {
		fetchSeoConfig()
			.then((c) => {
				setWordsPerMinute(c.wordsPerMinute);
				setSiteUrl(c.siteUrl ?? "");
				setCollections(c.analyzableCollections.join(", "));
				setStatus("ready");
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : "Erreur inconnue");
				setStatus("error");
			});
	}, []);

	async function save() {
		setBusy(true);
		setSaved(false);
		setError("");
		try {
			const parsed = collections
				.split(",")
				.map((c) => c.trim())
				.filter(Boolean);
			if (parsed.length === 0) throw new Error("Indique au moins une collection.");

			const next = await saveSeoConfig({
				wordsPerMinute,
				// Chaîne vide = pas d'URL : la route attend `null`, pas `""`,
				// que la validation `z.string().url()` rejetterait.
				siteUrl: siteUrl.trim() === "" ? null : siteUrl.trim(),
				analyzableCollections: parsed,
			});
			setWordsPerMinute(next.wordsPerMinute);
			setSiteUrl(next.siteUrl ?? "");
			setCollections(next.analyzableCollections.join(", "));
			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
		} finally {
			setBusy(false);
		}
	}

	if (status === "loading") return <LoadingState />;
	if (status === "error") return <ErrorState message={error} />;

	return (
		<PageShell title="SEO Settings" subtitle="Paramètres du moteur d'analyse">
			{error && <ErrorState message={error} />}

			<section className={styles.section}>
				<label className={styles.sectionTitle} htmlFor="wpm">
					Vitesse de lecture (mots par minute)
				</label>
				<input
					id="wpm"
					className={styles.focusInput}
					type="number"
					min={50}
					max={1000}
					value={wordsPerMinute}
					onChange={(e) => setWordsPerMinute(Number(e.target.value))}
				/>
				<span className={styles.source}>Sert au calcul du temps de lecture affiché.</span>
			</section>

			<section className={styles.section}>
				<label className={styles.sectionTitle} htmlFor="siteUrl">
					URL du site
				</label>
				<input
					id="siteUrl"
					className={styles.focusInput}
					type="url"
					placeholder="https://cannelle.news"
					value={siteUrl}
					onChange={(e) => setSiteUrl(e.target.value)}
				/>
				<span className={styles.source}>
					Sans elle, tout lien absolu vers le site est compté comme externe.
				</span>
			</section>

			<section className={styles.section}>
				<label className={styles.sectionTitle} htmlFor="collections">
					Collections analysées
				</label>
				<input
					id="collections"
					className={styles.focusInput}
					value={collections}
					onChange={(e) => setCollections(e.target.value)}
					placeholder="posts, pages"
				/>
				<span className={styles.source}>
					Séparées par des virgules. Le hook d'enregistrement ignore les autres.
				</span>
			</section>

			<div className={styles.focusRow}>
				<button type="button" className={styles.button} disabled={busy} onClick={() => void save()}>
					{busy ? "Enregistrement…" : "Enregistrer"}
				</button>
				{saved && <span className={styles.source}>Enregistré.</span>}
			</div>
		</PageShell>
	);
}

export default SettingsPage;
