import type { ReactNode } from "react";
import styles from "../styles/Glossary.module.css";

/**
 * Briques partagées par la page de glossaire et le widget de champ.
 *
 * Écrites ici plutôt qu'importées de `@emdash-cms/admin` : le dépôt proscrit
 * les librairies de composants, et rester sur du HTML nu garde l'UI neutre
 * vis-à-vis du thème de l'admin (les couleurs viennent des variables
 * `--color-kumo-*`, avec repli clair).
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
	variant?: "primary" | "secondary" | "danger";
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

/**
 * Champ de formulaire avec sa description.
 *
 * La description est rendue sous le libellé et avant le contrôle : elle décrit
 * l'usage du champ (où la valeur se retrouve côté public), pas sa syntaxe —
 * celle-ci va dans le `placeholder`.
 */
export function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
	return (
		<label className={styles.field}>
			<span className={styles.label}>{label}</span>
			<span className={styles.hint}>{hint}</span>
			{children}
		</label>
	);
}

export function Status({ tone, children }: { tone: "info" | "error" | "success"; children: ReactNode }) {
	return (
		<p className={styles.status} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
			{children}
		</p>
	);
}
