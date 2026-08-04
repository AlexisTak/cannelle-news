/**
 * Les CSS Modules n'ont pas de types : sans cette déclaration, chaque
 * `import styles from "./X.module.css"` casse `astro check`.
 */
declare module "*.module.css" {
	const classes: Record<string, string>;
	export default classes;
}
