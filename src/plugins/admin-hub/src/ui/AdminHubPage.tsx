import { ADMIN_CATEGORIES } from "../catalog";

const styles = {
	page: { maxWidth: 1180, margin: "0 auto", padding: "8px 4px 48px" },
	header: { marginBottom: 28 },
	title: { fontSize: 30, lineHeight: 1.15, fontWeight: 750, margin: "0 0 8px" },
	intro: { color: "var(--color-kumo-subtle)", margin: 0, maxWidth: 760 },
	category: { marginTop: 32 },
	categoryTitle: { fontSize: 19, fontWeight: 700, margin: "0 0 4px" },
	categoryText: { color: "var(--color-kumo-subtle)", margin: "0 0 14px" },
	grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 },
	card: { border: "1px solid var(--color-kumo-line)", borderRadius: 12, padding: 18, background: "var(--color-kumo-base)", display: "flex", flexDirection: "column" as const, minHeight: 150 },
	cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 7px" },
	cardText: { color: "var(--color-kumo-subtle)", fontSize: 14, lineHeight: 1.45, margin: "0 0 18px", flex: 1 },
	actions: { display: "flex", gap: 8, flexWrap: "wrap" as const },
	primary: { display: "inline-flex", padding: "7px 11px", borderRadius: 8, background: "var(--color-kumo-brand)", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 650 },
	secondary: { display: "inline-flex", padding: "7px 11px", borderRadius: 8, border: "1px solid var(--color-kumo-line)", color: "inherit", textDecoration: "none", fontSize: 13, fontWeight: 650 },
};

export function AdminHubPage() {
	return <main style={styles.page}>
		<header style={styles.header}>
			<h1 style={styles.title}>Centre Cannelle</h1>
			<p style={styles.intro}>Tous les outils éditoriaux sont regroupés par usage. Ouvrez un module pour travailler, ou sa configuration pour gérer ses règles et fournisseurs.</p>
		</header>
		{ADMIN_CATEGORIES.map((category) => <section key={category.id} style={styles.category} aria-labelledby={`category-${category.id}`}>
			<h2 id={`category-${category.id}`} style={styles.categoryTitle}>{category.name}</h2>
			<p style={styles.categoryText}>{category.description}</p>
			<div style={styles.grid}>
				{category.tools.map((tool) => <article key={tool.id} style={styles.card}>
					<h3 style={styles.cardTitle}>{tool.name}</h3>
					<p style={styles.cardText}>{tool.description}</p>
					<div style={styles.actions}>
						<a href={tool.page} style={styles.primary}>Ouvrir</a>
						{tool.settings && <a href={tool.settings} style={styles.secondary}>Configuration</a>}
					</div>
				</article>)}
			</div>
		</section>)}
	</main>;
}
