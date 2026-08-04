import { useEffect, useState } from "react";
import type { GlossaryTerm } from "../lib/types";
import { apiFetch } from "./api";
import styles from "./Glossary.module.css";

/**
 * Widget de champ minimal servant de point d'entrée pour taguer un terme.
 *
 * L'éditeur d'EmDash ne permet pas (v0.30) de remplacer nativement le menu
 * contextuel du portable-text depuis un plugin. La méthode recommandée est
 * d'ajouter une mark custom via le plugin, et de fournir un champ helper qui
 * affiche la liste des termes et copie la mark sélectionnée dans le presse-
 * papier, que le rédacteur peut coller dans un snippet d'admin personnalisé,
 * ou — si le thème l'implémente — via un bouton de raccourci ProseMirror
 * ajouté au toolbar.
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

/**
 * Copie avec repli.
 *
 * `navigator.clipboard` exige un contexte sécurisé : en HTTP sur une IP de
 * réseau local — cas courant en préproduction — il est absent, et le bouton
 * doit quand même fonctionner.
 */
async function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const area = document.createElement("textarea");
	area.value = text;
	area.setAttribute("readonly", "");
	area.style.position = "fixed";
	area.style.opacity = "0";
	document.body.appendChild(area);
	area.select();
	document.execCommand("copy");
	document.body.removeChild(area);
}

export function GlossaryMarkButton({ label }: PluginFieldProps) {
	const [terms, setTerms] = useState<GlossaryTerm[]>([]);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	useEffect(() => {
		apiFetch<{ terms: GlossaryTerm[] }>("terms/list", {})
			.then((res) => setTerms(Array.isArray(res?.terms) ? res.terms : []))
			.catch(() => setTerms([]));
	}, []);

	async function copyPayload(term: GlossaryTerm) {
		const payload = JSON.stringify({
			_type: "markDef",
			_typeName: "glossaryTerm",
			termId: term.id,
			term: term.term,
			definition: term.definition,
			fullUrl: term.fullUrl,
		});

		try {
			await copyText(payload);
			setCopiedId(term.id);
			setTimeout(() => setCopiedId(null), 1500);
		} catch {
			// Copie refusée par le navigateur : ne pas afficher un succès. Le
			// rédacteur réessaie, ou copie à la main depuis la page Glossaire.
			setCopiedId(null);
		}
	}

	return (
		<div className={styles.widget}>
			<span className={styles.widgetLabel}>{label ?? "Insérer un terme de glossaire"}</span>

			{terms.length === 0 ? (
				<p className={styles.widgetHint}>
					Aucun terme défini. Créez-en dans la page Glossaire.
				</p>
			) : (
				<>
					<p className={styles.widgetHint}>
						Copiez un terme, puis appliquez la mark dans l'éditeur.
					</p>
					<div className={styles.chips}>
						{terms.map((term) => (
							<button
								key={term.id}
								type="button"
								className={styles.chip}
								data-copied={copiedId === term.id}
								onClick={() => copyPayload(term)}
								title={term.definition}
							>
								{term.term}
								<span className={styles.chipMark} aria-hidden="true">
									{copiedId === term.id ? "copié" : "copier"}
								</span>
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}
