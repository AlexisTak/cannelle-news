import styles from "../styles/IssueList.module.css";
import type { Issue, Severity } from "../../domain/report";

interface Props {
	issues: Issue[];
}

const SEVERITY_ICON: Record<Severity, string> = {
	error: "✕",
	warning: "!",
	info: "i",
};

/** Erreurs d'abord : c'est ce que le rédacteur doit corriger en priorité. */
const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function IssueList({ issues }: Props) {
	if (issues.length === 0) {
		return <p className={styles.empty}>Aucun problème détecté.</p>;
	}

	const sorted = [...issues].sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	);

	return (
		<ul className={styles.list}>
			{sorted.map((issue, i) => (
				<li
					// `ruleId` n'est pas unique : une règle peut lever plusieurs
					// problèmes, d'où l'index en complément.
					key={`${issue.ruleId}-${i}`}
					className={styles.item}
					data-severity={issue.severity}
				>
					<span aria-hidden="true">{SEVERITY_ICON[issue.severity]}</span>
					<div className={styles.body}>
						<span className={styles.message}>{issue.message}</span>
						{issue.help && <span className={styles.help}>{issue.help}</span>}
						<span className={styles.rule}>{issue.ruleId}</span>
					</div>
				</li>
			))}
		</ul>
	);
}
