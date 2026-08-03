import styles from "../styles/KeywordDensityBar.module.css";

interface Props {
	density: number;
}

/** Échelle plafonnée à 5 % : au-delà, c'est du bourrage et le détail importe peu. */
const SCALE_MAX = 5;

export function KeywordDensityBar({ density }: Props) {
	const pct = Math.min(100, (density / SCALE_MAX) * 100);
	return (
		<div className={styles.container}>
			<div
				className={styles.track}
				role="meter"
				aria-valuenow={density}
				aria-valuemin={0}
				aria-valuemax={SCALE_MAX}
				aria-label="Densité du mot-clé cible"
			>
				<div className={styles.idealZone} style={{ left: "10%", right: "70%" }} />
				<div className={styles.bar} style={{ width: `${pct}%` }} />
			</div>
			<span className={styles.value}>{density.toFixed(2)} %</span>
		</div>
	);
}
