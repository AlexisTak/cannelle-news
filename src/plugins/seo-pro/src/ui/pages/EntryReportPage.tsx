import { useCallback, useEffect, useState } from "react";
import styles from "../styles/EntryReport.module.css";
import { PageShell, LoadingState, ErrorState } from "../components/PageShell";
import { ScoreGauge } from "../components/ScoreGauge";
import { MetricCard } from "../components/MetricCard";
import { IssueList } from "../components/IssueList";
import { KeywordDensityBar } from "../components/KeywordDensityBar";
import { fetchReport, reanalyze, setFocusKeyword, generateMeta, applyMeta } from "../api";
import type { SeoReport, GenerateMetaOutput } from "../api";
import type { MetricStatus } from "../components/MetricCard";

function densityStatus(density: number, hasFocus: boolean): MetricStatus {
	if (!hasFocus) return "warning";
	if (density >= 0.5 && density <= 1.5) return "good";
	return density > 2.5 ? "error" : "warning";
}

export function EntryReportPage() {
	// Les paramètres viennent de la query string, pas du chemin : EmDash résout
	// les pages de plugin par égalité stricte de clé, donc aucun segment
	// dynamique n'est possible dans le chemin (voir `admin.tsx`).
	const search = new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	);
	const collection = search.get("collection") ?? "";
	const id = search.get("id") ?? "";

	const [report, setReport] = useState<SeoReport | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [keyword, setKeyword] = useState("");
	const [generated, setGenerated] = useState<GenerateMetaOutput | null>(null);
	const [applied, setApplied] = useState(false);

	const load = useCallback(async () => {
		setStatus("loading");
		try {
			const r = await fetchReport(collection, id);
			setReport(r);
			setKeyword(r.focusKeyword ?? "");
			setStatus("ready");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
			setStatus("error");
		}
	}, [collection, id]);

	useEffect(() => {
		if (collection && id) void load();
	}, [collection, id, load]);

	async function run(action: () => Promise<SeoReport>) {
		setBusy(true);
		try {
			const r = await action();
			setReport(r);
			setKeyword(r.focusKeyword ?? "");
			setError("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
		} finally {
			setBusy(false);
		}
	}

	async function handleGenerate() {
		setBusy(true);
		setError("");
		setApplied(false);
		try {
			const result = await generateMeta(collection, id);
			setGenerated(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
		} finally {
			setBusy(false);
		}
	}

	async function handleApply() {
		if (!generated) return;
		setBusy(true);
		setError("");
		try {
			await applyMeta(collection, id, {
				title: generated.generated.title,
				description: generated.generated.description,
			});
			setApplied(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
		} finally {
			setBusy(false);
		}
	}

	if (!collection || !id) {
		return <ErrorState message="Aucun article ciblé. Ouvre cette page depuis le dashboard." />;
	}
	if (status === "loading") return <LoadingState label="Analyse en cours…" />;
	if (status === "error" || !report) return <ErrorState message={error} />;

	const m = report.metrics;
	const hasFocus = report.focusKeyword !== null;

	return (
		<PageShell
			title="Analyse SEO"
			subtitle={`${report.collection} · moteur ${report.engineVersion}`}
			actions={
				<button
					type="button"
					className={styles.button}
					disabled={busy}
					onClick={() => void run(() => reanalyze(collection, id))}
				>
					{busy ? "Analyse…" : "Réanalyser"}
				</button>
			}
		>
			{error && <ErrorState message={error} />}

			<div className={styles.top}>
				<ScoreGauge score={report.score} grade={report.grade} size="lg" />
				<div className={styles.topMeta}>
					<h2 className={styles.entryTitle}>{report.title}</h2>
					<span className={styles.meta}>
						Analysé le {new Date(report.analyzedAt).toLocaleString("fr-FR")}
					</span>
					<span className={styles.meta}>
						{m.wordCount} mots · {m.readingTimeMinutes} min de lecture
					</span>
				</div>
			</div>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>Mot-clé cible</h3>
				<div className={styles.focusRow}>
					<input
						className={styles.focusInput}
						value={keyword}
						maxLength={60}
						placeholder="Aucun mot-clé défini"
						onChange={(e) => setKeyword(e.target.value)}
						aria-label="Mot-clé cible"
					/>
					<button
						type="button"
						className={styles.button}
						disabled={busy}
						onClick={() =>
							void run(() => setFocusKeyword(collection, id, keyword.trim() || null))
						}
					>
						Enregistrer
					</button>
					{hasFocus && (
						<button
							type="button"
							className={styles.button}
							disabled={busy}
							onClick={() => void run(() => setFocusKeyword(collection, id, null))}
						>
							Effacer
						</button>
					)}
				</div>
				<span className={styles.source}>
					{report.focusKeywordSource === "manual"
						? "Défini manuellement"
						: "Déduit automatiquement du contenu"}
				</span>
				<KeywordDensityBar density={m.keywordDensity} />
				{report.suggestedKeywords.length > 0 && (
					<div className={styles.suggestions}>
						{report.suggestedKeywords.map((k) => (
							<button
								key={k}
								type="button"
								className={styles.chip}
								onClick={() => setKeyword(k)}
							>
								{k}
							</button>
						))}
					</div>
				)}
			</section>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>Génération de meta</h3>
				<div className={styles.focusRow}>
					<button
						type="button"
						className={styles.button}
						disabled={busy}
						onClick={() => void handleGenerate()}
					>
						{busy ? "Génération…" : "Générer title + meta"}
					</button>
					{generated && (
						<button
							type="button"
							className={styles.button}
							disabled={busy}
							onClick={() => void handleApply()}
						>
							Appliquer au panneau SEO
						</button>
					)}
				</div>
				{applied && (
					<p className={styles.source}>
						Meta appliquée. Recharge l'éditeur pour la voir dans le panneau SEO.
					</p>
				)}
				{generated && (
					<div className={styles.generatedBox}>
						<div className={styles.generatedField}>
							<span className={styles.generatedLabel}>Title suggéré ({generated.generated.title.length} car.)</span>
							<p className={styles.generatedValue}>{generated.generated.title}</p>
						</div>
						<div className={styles.generatedField}>
							<span className={styles.generatedLabel}>Meta description suggérée ({generated.generated.description.length} car.)</span>
							<p className={styles.generatedValue}>{generated.generated.description}</p>
						</div>
						<div className={styles.generatedField}>
							<span className={styles.generatedLabel}>OpenGraph / Twitter</span>
							<p className={styles.generatedValue}>
								Type : {generated.generated.openGraph.type} · Card : {generated.generated.twitter.card}
								{generated.generated.openGraph.image && " · Image : " + generated.generated.openGraph.image}
							</p>
						</div>
					</div>
				)}
			</section>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>Métriques</h3>
				<div className={styles.metrics}>
					<MetricCard
						label="Mots"
						value={m.contentLength.words}
						ideal="900 à 2500"
						status={
							m.contentLength.verdict === "ideal"
								? "good"
								: m.contentLength.verdict === "acceptable" || m.contentLength.verdict === "long"
									? "warning"
									: "error"
						}
					/>
					<MetricCard
						label={`Lisibilité (${m.readability.formula})`}
						value={`${m.readability.score} · ${m.readability.grade}`}
						ideal="60 à 90"
						status={
							m.readability.score >= 60 && m.readability.score <= 90
								? "good"
								: m.readability.score >= 50
									? "warning"
									: "error"
						}
					/>
					<MetricCard
						label="Occurrences du mot-clé"
						value={m.keywordOccurrences}
						status={densityStatus(m.keywordDensity, hasFocus)}
					/>
					<MetricCard
						label="Intertitres H2 / H3"
						value={`${m.h2Count} / ${m.h3Count}`}
						ideal="au moins 1 de chaque"
						status={m.h2Count === 0 ? "error" : m.h3Count === 0 ? "warning" : "good"}
					/>
					<MetricCard
						label="Liens internes / externes"
						value={`${m.internalLinks} / ${m.externalLinks}`}
						ideal="2 et 1"
						status={
							m.internalLinks >= 2 && m.externalLinks >= 1
								? "good"
								: m.internalLinks === 0 && m.externalLinks === 0
									? "error"
									: "warning"
						}
					/>
					<MetricCard
						label="Images sans texte alternatif"
						value={`${m.imagesWithoutAlt} / ${m.imagesTotal}`}
						status={
							m.imagesWithoutAlt === 0
								? "good"
								: m.imagesWithoutAlt / Math.max(1, m.imagesTotal) <= 0.25
									? "warning"
									: "error"
						}
					/>
				</div>
			</section>

			<section className={styles.section}>
				<h3 className={styles.sectionTitle}>
					Problèmes ({report.issues.length})
				</h3>
				<IssueList issues={report.issues} />
			</section>
		</PageShell>
	);
}

export default EntryReportPage;
