import TldrBlock from "./TldrBlock.astro";
import TldrBox from "./TldrBox.astro";

/**
 * Composants de rendu côté site.
 *
 * `blockComponents` est un nom **imposé** : EmDash fusionne cet export dans
 * `<PortableText>` automatiquement, les gabarits du site n'ont rien à importer
 * pour que le bloc `aiTldr` s'affiche.
 *
 * `TldrBox` n'est pas un bloc : il rend le champ `tldr` de la collection et
 * doit être placé explicitement par le gabarit.
 */
export const blockComponents = {
	aiTldr: TldrBlock,
};

export { TldrBlock, TldrBox };
