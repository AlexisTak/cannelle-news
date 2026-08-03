import styles from "../styles/ScoreGauge.module.css";
import type { Grade } from "../../domain/report";

interface Props {
	score: number;
	grade: Grade;
	size?: "sm" | "md" | "lg";
}

const GRADE_COLOR: Record<Grade, string> = {
	good: "var(--color-kumo-success, #16a34a)",
	ok: "var(--color-kumo-warning, #d97706)",
	poor: "var(--color-kumo-danger, #dc2626)",
};

const GRADE_LABEL: Record<Grade, string> = {
	good: "bon",
	ok: "moyen",
	poor: "faible",
};

/** Demi-jauge : l'arc couvre 180°, d'où les `* 0.5` sur la circonférence. */
export function ScoreGauge({ score, grade, size = "md" }: Props) {
	const radius = size === "lg" ? 80 : size === "md" ? 50 : 30;
	const stroke = radius * 0.2;
	const circumference = 2 * Math.PI * radius;
	const half = circumference * 0.5;
	const dash = (Math.max(0, Math.min(100, score)) / 100) * half;
	const cx = radius * 1.2;
	const cy = radius * 1.1;

	return (
		<div className={styles.gauge} data-size={size}>
			<svg
				viewBox={`0 0 ${radius * 2.4} ${radius * 1.4}`}
				className={styles.svg}
				role="img"
				aria-label={`Score SEO ${score} sur 100 (${GRADE_LABEL[grade]})`}
			>
				<circle
					className={styles.track}
					cx={cx}
					cy={cy}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					strokeDasharray={`${half} ${circumference}`}
					transform={`rotate(180 ${cx} ${cy})`}
				/>
				<circle
					cx={cx}
					cy={cy}
					r={radius}
					fill="none"
					stroke={GRADE_COLOR[grade]}
					strokeWidth={stroke}
					strokeDasharray={`${dash} ${circumference}`}
					transform={`rotate(180 ${cx} ${cy})`}
					strokeLinecap="round"
				/>
			</svg>
			<span className={styles.score}>{score}</span>
			<span className={styles.grade}>{GRADE_LABEL[grade]}</span>
		</div>
	);
}
