import type { ReactNode } from "react";
import styles from "../styles/Dashboard.module.css";

interface Props {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
	children: ReactNode;
}

/** Ossature commune aux trois pages : en-tête, actions, corps. */
export function PageShell({ title, subtitle, actions, children }: Props) {
	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1 className={styles.title}>{title}</h1>
					{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
				</div>
				{actions}
			</header>
			{children}
		</div>
	);
}

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
	return (
		<p className={styles.state} role="status">
			{label}
		</p>
	);
}

export function ErrorState({ message }: { message: string }) {
	return (
		<p className={`${styles.state} ${styles.error}`} role="alert">
			{message}
		</p>
	);
}

export function EmptyState({ label }: { label: string }) {
	return <p className={styles.state}>{label}</p>;
}
