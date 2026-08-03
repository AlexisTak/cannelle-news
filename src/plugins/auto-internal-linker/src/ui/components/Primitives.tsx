import { useCallback, useState, type ReactNode } from "react";
import styles from "../styles/Linker.module.css";

/**
 * Briques partagées par le widget et la page de réglages.
 *
 * Écrites ici plutôt qu'importées de `@emdash-cms/admin` : le dépôt proscrit
 * les librairies de composants, et rester sur du HTML nu garde l'UI neutre
 * vis-à-vis du thème de l'admin.
 */

export function Button({
	children,
	onClick,
	disabled,
	variant,
	title,
	type = "button",
}: {
	children: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	variant?: "primary";
	title?: string;
	type?: "button" | "submit";
}) {
	return (
		<button
			type={type}
			className={styles.button}
			data-variant={variant}
			onClick={onClick}
			disabled={disabled}
			title={title}
		>
			{children}
		</button>
	);
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTitle}>{title}</span>
			</div>
			{hint && <p className={styles.hint}>{hint}</p>}
			{children}
		</section>
	);
}

export function Status({ tone, children }: { tone: "info" | "error" | "success"; children: ReactNode }) {
	return (
		<p className={styles.status} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
			{children}
		</p>
	);
}

export interface AsyncTask<T> {
	data: T | null;
	busy: boolean;
	error: string | null;
	notice: string | null;
	run(task: () => Promise<T>): Promise<T | null>;
	announce(message: string): void;
	reset(): void;
}

/**
 * Enveloppe une opération réseau en états affichables.
 *
 * Les erreurs sont capturées et rendues dans le widget : une exception qui
 * remonterait déclencherait `PluginFieldErrorBoundary` et remplacerait le champ
 * par un message générique — le rédacteur perdrait l'accès à l'outil.
 */
export function useAsyncTask<T>(): AsyncTask<T> {
	const [data, setData] = useState<T | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const run = useCallback(async (task: () => Promise<T>) => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			const result = await task();
			setData(result);
			return result;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur inconnue");
			return null;
		} finally {
			setBusy(false);
		}
	}, []);

	const announce = useCallback((message: string) => {
		setError(null);
		setNotice(message);
	}, []);

	const reset = useCallback(() => {
		setData(null);
		setError(null);
		setNotice(null);
	}, []);

	return { data, busy, error, notice, run, announce, reset };
}

/** « Analysé sur la version enregistrée du 3 août à 09:12 ». */
export function formatVersion(updatedAt: string | null): string {
	if (!updatedAt) return "version enregistrée";
	const date = new Date(updatedAt);
	if (Number.isNaN(date.getTime())) return "version enregistrée";
	return `version enregistrée du ${date.toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
	})} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
