import { useState } from "react";
import { Status } from "../components/Primitives";
import { readEntryRef } from "../entry-ref";
import styles from "../styles/Assistant.module.css";
import type { PluginFieldProps } from "./TldrField";
import { MetaDescriptionSection } from "./panel/MetaDescriptionSection";
import { SeoTitlesSection } from "./panel/SeoTitlesSection";
import { VulgarizeSection } from "./panel/VulgarizeSection";

/**
 * Panneau assistant, monté sur un champ `json` de la collection.
 *
 * Le champ hôte n'est qu'un point d'ancrage : `onChange` n'est jamais appelé,
 * la valeur reste `null` en base. C'est délibéré — le panneau produit des
 * textes destinés au panneau SEO ou au presse-papier, rien qui mérite d'être
 * conservé dans le contenu. Désinstaller le plugin ne laisse donc aucune
 * donnée orpheline derrière lui.
 */
export function AssistantPanelField({ label, id }: PluginFieldProps) {
	const [entry] = useState(() => readEntryRef());

	return (
		<div className={styles.root}>
			<span className={styles.label} id={id}>
				{label ?? "Assistant IA"}
			</span>

			{!entry ? (
				<Status tone="info">
					Enregistrez l'article une première fois : l'assistant travaille sur la version
					enregistrée, pas sur le brouillon affiché.
				</Status>
			) : (
				<>
					<SeoTitlesSection entry={entry} />
					<MetaDescriptionSection entry={entry} />
					<VulgarizeSection entry={entry} />
				</>
			)}
		</div>
	);
}

export default AssistantPanelField;
