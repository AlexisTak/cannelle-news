import styles from "../styles/MetricCard.module.css";

export type MetricStatus = "good" | "warning" | "error";

interface Props {
	label: string;
	value: string | number;
	ideal?: string;
	status: MetricStatus;
}

export function MetricCard({ label, value, ideal, status }: Props) {
	return (
		<div className={styles.card} data-status={status}>
			<span className={styles.value}>{value}</span>
			<span className={styles.label}>{label}</span>
			{ideal && <span className={styles.ideal}>Idéal : {ideal}</span>}
		</div>
	);
}
