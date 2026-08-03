/**
 * Les CSS Modules n'existent qu'au build Vite : TypeScript a besoin d'une
 * déclaration pour accepter `import styles from "./X.module.css"`.
 */
declare module "*.module.css" {
	const classes: Record<string, string>;
	export default classes;
}
