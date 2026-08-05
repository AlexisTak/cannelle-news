import { useEffect, useState } from "react";
import type { GlossaryTerm } from "../lib/types";
import { apiFetch } from "./api";
import styles from "./styles/Glossary.module.css";

/**
 * Widget de champ minimal servant de point d'entrée pour taguer un terme.
 *
 * L'éditeur d'EmDash ne permet pas (v0.30) de remplacer nativement le menu
 * contextuel du portable-text depuis un plugin. La méthode recommandée est
 * d'ajouter une mark custom via le plugin, et de fournir un champ helper qui
 * affiche la liste des termes et injecte la mark sélectionnée dans le presse-
 * papier sous forme de JSON, que le rédacteur peut coller dans un snippet
 * d'admin personnalisé, ou — si le thème l'implémente — via un bouton de
 * raccourci ProseMirror ajouté au toolbar.
 *
 * Ce widget garde l'interface minimale et sans dépendance à l'éditeur interne.
 */
export interface PluginFieldProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label?: string;
	id?: string;
	required?: boolean;
	minimal?: boolean;
}

export function GlossaryMarkButton({ label }: PluginFieldProps) {
	const [terms, setTerms] = useState<GlossaryTerm[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		apiFetch<{ terms: GlossaryTerm[] }>("terms/list", {})
			.then((res) => setTerms(res.terms ?? []))
			.catch(() => setTerms([]));
	}, []);

	function copyPayload(term: GlossaryTerm) {
		const payload = JSON.stringify({
			_type: "markDef",
			_typeName: "glossaryTerm",
			termId: term.id,
			term: term.term,
			definition: term.definition,
			fullUrl: term.fullUrl,
		});
		navigator.clipboard.writeText(payload).then(() => {
			setSelected(term.id);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}

	return (
		<div className={styles.root}>
			<span className={styles.label}>{label ?? "Insérer un terme de glossaire"}</span>
			<p className={styles.hint}>
				Sélectionnez un terme : sa définition est copiée dans le presse-papier, prête à
				être collée comme mark dans l'éditeur.
			</p>
			<div className={styles.row}>
				{terms.map((term) => (
					<button
						key={term.id}
						type="button"
						className={styles.button}
						data-variant={selected === term.id ? "primary" : undefined}
						onClick={() => copyPayload(term)}
						title={term.definition}
					>
						{term.term}
						{copied && selected === term.id && <span> ✓</span>}
					</button>
				))}
			</div>
			{terms.length === 0 && (
				<p className={styles.empty}>Aucun terme. Créez-en dans la page Glossaire.</p>
			)}
		</div>
	);
}
