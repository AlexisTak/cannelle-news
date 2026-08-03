import { useEffect, useState } from "react";
import type { LinkerConfig } from "../../domain/config";
import { DEFAULT_CONFIG } from "../../domain/config";
import { Button, Section, Status, useAsyncTask } from "../components/Primitives";
import { fetchLinkerSettings, rebuildIndex, saveLinkerSettings } from "../api";
import styles from "../styles/Linker.module.css";

/**
 * Page de réglages du maillage interne.
 *
 * Composant sans props : `PluginAdminModule` monte les pages de plugin comme
 * des `ComponentType` nus (`@emdash-cms/admin/dist/index.d.ts:76`).
 */
export function SettingsPage() {
	const loadTask = useAsyncTask<{ config: LinkerConfig; indexSize: number }>();
	const saveTask = useAsyncTask<{ config: LinkerConfig; indexSize: number }>();
	const rebuildTask = useAsyncTask<{ entriesProcessed: number; keywordsIndexed: number }>();

	const [collections, setCollections] = useState("posts");
	const [maxLinks, setMaxLinks] = useState(5);
	const [minLength, setMinLength] = useState(3);
	const [siteUrl, setSiteUrl] = useState("");
	const [patterns, setPatterns] = useState<Record<string, string>>({});
	const [sources, setSources] = useState(DEFAULT_CONFIG.sources);

	useEffect(() => {
		loadTask
			.run(() => fetchLinkerSettings())
			.then((output) => {
				if (!output) return;
				setCollections(output.config.analyzableCollections.join(", "));
				setMaxLinks(output.config.maxLinksPerEntry);
				setMinLength(output.config.minKeywordLength);
				setSiteUrl(output.config.siteUrl ?? "");
				setPatterns(output.config.urlPatterns);
				setSources(output.config.sources);
			});
	}, []);

	const dirty =
		loadTask.data &&
		(collections !== loadTask.data.config.analyzableCollections.join(", ") ||
			maxLinks !== loadTask.data.config.maxLinksPerEntry ||
			minLength !== loadTask.data.config.minKeywordLength ||
			siteUrl !== (loadTask.data.config.siteUrl ?? "") ||
			JSON.stringify(patterns) !== JSON.stringify(loadTask.data.config.urlPatterns) ||
			JSON.stringify(sources) !== JSON.stringify(loadTask.data.config.sources));

	async function save() {
		const analyzableCollections = collections
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean);
		if (analyzableCollections.length === 0) {
			saveTask.announce("Indique au moins une collection.");
			return;
		}

		const result = await saveTask.run(() =>
			saveLinkerSettings({
				analyzableCollections,
				maxLinksPerEntry: maxLinks,
				minKeywordLength: minLength,
				siteUrl: siteUrl.trim() === "" ? null : siteUrl.trim(),
				urlPatterns: patterns,
				sources,
			}),
		);

		if (result) {
			setCollections(result.config.analyzableCollections.join(", "));
			setMaxLinks(result.config.maxLinksPerEntry);
			setMinLength(result.config.minKeywordLength);
			setSiteUrl(result.config.siteUrl ?? "");
			setPatterns(result.config.urlPatterns);
			setSources(result.config.sources);
			loadTask.announce(`Enregistré. Index actuel : ${result.indexSize} mots-clés.`);
		}
	}

	async function rebuild() {
		const result = await rebuildTask.run(() => rebuildIndex());
		if (result) {
			const fresh = await loadTask.run(() => fetchLinkerSettings());
			if (fresh) loadTask.announce(`${result.entriesProcessed} articles, ${result.keywordsIndexed} mots-clés indexés.`);
		}
	}

	if (loadTask.busy && !loadTask.data) {
		return <p className={styles.status} role="status">Chargement…</p>;
	}

	if (loadTask.error || !loadTask.data) {
		return <p className={styles.status} data-tone="error" role="alert">{loadTask.error || "Erreur inconnue"}</p>;
	}

	return (
		<div className={styles.root}>
			<h1 className={styles.label}>Maillage interne</h1>
			<p className={styles.hint}>
				Le plugin indexe les mots-clés des articles publiés et propose des liens internes
				dans l'éditeur. Une indexation ratée ne bloque jamais une publication.
			</p>

			<Section title="Collections analysées" hint="Séparées par des virgules. Les hooks ignorent les autres.">
				<input
					className={styles.input}
					value={collections}
					onChange={(event) => setCollections(event.target.value)}
					placeholder="posts, pages"
				/>
			</Section>

			<Section title="URL publique du site" hint="Permet de classer les liens absolus comme internes.">
				<input
					className={styles.input}
					type="url"
					value={siteUrl}
					onChange={(event) => setSiteUrl(event.target.value)}
					placeholder="https://cannelle.news"
				/>
			</Section>

			<Section title="Plafonds" hint="Protection contre le keyword stuffing.">
				<div className={styles.row}>
					<label className={styles.hint}>
						Liens max / article
						<input
							className={styles.input}
							type="number"
							min={1}
							max={50}
							value={maxLinks}
							onChange={(event) => setMaxLinks(Number(event.target.value))}
						/>
					</label>
					<label className={styles.hint}>
						Longueur min auto
						<input
							className={styles.input}
							type="number"
							min={1}
							max={20}
							value={minLength}
							onChange={(event) => setMinLength(Number(event.target.value))}
						/>
					</label>
				</div>
			</Section>

			<Section title="Sources de mots-clés" hint="Désactivez celles qui produisent trop de bruit.">
				<div className={styles.row}>
					{(
						[
							["manual", "Mots-clés manuels"],
							["title", "Titre de l'article"],
							["taxonomy", "Taxonomies"],
							["extracted", "Extraction automatique"],
						] as const
					).map(([key, label]) => (
						<label className={styles.hint} key={key}>
							<input
								type="checkbox"
								checked={sources[key as keyof typeof sources]}
								onChange={(event) =>
									setSources((prev) => ({ ...prev, [key]: event.target.checked }))
								}
							/>
							{label}
						</label>
					))}
				</div>
			</Section>

			<Section title="Motifs d'URL" hint="{slug} est interpolé. Un article sans motif de collection n'est pas indexé.">
				{Object.entries(patterns).map(([collection, pattern]) => (
					<div className={styles.row} key={collection}>
						<input
							className={styles.input}
							value={collection}
							readOnly
							title="Collection"
						/>
						<input
							className={styles.input}
							value={pattern}
							onChange={(event) =>
								setPatterns((prev) => ({ ...prev, [collection]: event.target.value }))
							}
							placeholder="/posts/{slug}"
							title="Motif d'URL"
						/>
					</div>
				))}
			</Section>

			<div className={styles.row}>
				<Button onClick={() => void save()} disabled={saveTask.busy || !dirty} variant="primary">
					{saveTask.busy ? "Enregistrement…" : "Enregistrer"}
				</Button>
				<Button onClick={() => void rebuild()} disabled={rebuildTask.busy}>
					{rebuildTask.busy ? "Indexation…" : "Reconstruire l'index"}
				</Button>
				<span className={styles.hint}>Index actuel : {loadTask.data.indexSize} mots-clés</span>
			</div>

			{saveTask.error && <Status tone="error">{saveTask.error}</Status>}
			{saveTask.notice && <Status tone="success">{saveTask.notice}</Status>}
			{rebuildTask.error && <Status tone="error">{rebuildTask.error}</Status>}
			{rebuildTask.notice && <Status tone="success">{rebuildTask.notice}</Status>}
		</div>
	);
}

export default SettingsPage;
