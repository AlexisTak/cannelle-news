import { describe, expect, it } from "vitest";
import { createMockCtx } from "../test/mock-ctx";
import { createKeywordIndexStore } from "./infrastructure/keyword-index-store";
import { autoInternalLinkerPlugin, createPlugin } from "./index";

/**
 * Accès aux hooks résolus.
 *
 * `definePlugin` est une fonction d'identité typée : la définition qu'on lui
 * passe ressort telle quelle, hooks compris. Les tests peuvent donc appeler
 * chaque handler directement, sans monter de runtime EmDash.
 */
function hooks() {
	return createPlugin().hooks as unknown as Record<
		string,
		{ handler: (event: never, ctx: never) => Promise<unknown> }
	>;
}

function call(name: string, event: unknown, ctx: unknown): Promise<unknown> {
	return hooks()[name].handler(event as never, ctx as never);
}

const published = {
	id: "01J",
	slug: "les-llm",
	status: "published",
	title: "Les LLM",
	content: [],
	internal_links: { version: 1, manualKeywords: ["LLM"], accepted: [], ignored: [] },
};

const bodyWithTerm = [
	{
		_type: "block",
		_key: "b1",
		style: "normal",
		markDefs: [],
		children: [{ _type: "span", _key: "s1", text: "Un LLM récent", marks: [] }],
	},
];

const withAccepted = {
	...published,
	content: bodyWithTerm,
	internal_links: {
		version: 1,
		manualKeywords: [],
		accepted: [{ keyword: "LLM", targetId: "cible", targetUrl: "/posts/llm" }],
		ignored: [],
	},
};

describe("autoInternalLinkerPlugin", () => {
	it("expose le widget sous le nom référencé par le schéma", () => {
		const descriptor = autoInternalLinkerPlugin();
		expect(descriptor.id).toBe("auto-internal-linker");
		expect(descriptor.fieldWidgets).toMatchObject([{ name: "suggestions" }]);
	});

	it("déclare les capacités requises par ses hooks dans les deux contextes", () => {
		const expected = ["content:read", "content:write", "taxonomies:read"];
		expect(autoInternalLinkerPlugin().capabilities).toEqual(expected);
		expect(createPlugin().capabilities).toEqual(expected);
	});
});

describe("indexation", () => {
	it("indexe à la publication", async () => {
		const { ctx } = createMockCtx();
		await call("content:afterPublish", { content: published, collection: "posts" }, ctx);
		expect(await createKeywordIndexStore(ctx).count()).toBeGreaterThan(0);
	});

	it("réindexe un article déjà publié qu'on corrige", async () => {
		const { ctx } = createMockCtx();
		await call(
			"content:afterSave",
			{ content: published, collection: "posts", isNew: false },
			ctx,
		);
		expect(await createKeywordIndexStore(ctx).count()).toBeGreaterThan(0);
	});

	it("n'indexe pas un brouillon", async () => {
		const { ctx } = createMockCtx();
		await call(
			"content:afterSave",
			{ content: { ...published, status: "draft" }, collection: "posts", isNew: true },
			ctx,
		);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});

	it("n'accumule pas de doublons quand publication et enregistrement se suivent", async () => {
		const { ctx } = createMockCtx();
		await call("content:afterPublish", { content: published, collection: "posts" }, ctx);
		const after = await createKeywordIndexStore(ctx).count();

		await call(
			"content:afterSave",
			{ content: published, collection: "posts", isNew: false },
			ctx,
		);
		expect(await createKeywordIndexStore(ctx).count()).toBe(after);
	});
});

describe("purge de l'index", () => {
	async function indexed() {
		const mock = createMockCtx();
		await call("content:afterPublish", { content: published, collection: "posts" }, mock.ctx);
		expect(await createKeywordIndexStore(mock.ctx).count()).toBeGreaterThan(0);
		return mock;
	}

	it("purge à la dépublication", async () => {
		const { ctx } = await indexed();
		await call("content:afterUnpublish", { content: published, collection: "posts" }, ctx);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});

	it("purge à la suppression définitive", async () => {
		const { ctx } = await indexed();
		await call("content:afterDelete", { id: "01J", collection: "posts", permanent: true }, ctx);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});

	/**
	 * Mise à la corbeille : `permanent` vaut `false` et aucun
	 * `content:afterUnpublish` n'est émis (`emdash-runtime.ts:2968`). Sans purge
	 * ici, l'article resterait une cible de liens alors que son URL rend un 404.
	 */
	it("purge à la mise à la corbeille", async () => {
		const { ctx } = await indexed();
		await call("content:afterDelete", { id: "01J", collection: "posts", permanent: false }, ctx);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});

	it("réindexe un article sorti de la corbeille", async () => {
		const { ctx } = await indexed();
		await call("content:afterDelete", { id: "01J", collection: "posts", permanent: false }, ctx);
		await call("content:afterRestore", { content: published, collection: "posts" }, ctx);
		expect(await createKeywordIndexStore(ctx).count()).toBeGreaterThan(0);
	});

	it("ne réindexe pas un brouillon sorti de la corbeille", async () => {
		const { ctx } = createMockCtx();
		await call(
			"content:afterRestore",
			{ content: { ...published, status: "draft" }, collection: "posts" },
			ctx,
		);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});
});

describe("hook content:beforeSave", () => {
	it("pose les liens acceptés et rend le contenu modifié", async () => {
		const { ctx } = createMockCtx();
		const result = (await call(
			"content:beforeSave",
			{ content: withAccepted, collection: "posts", isNew: false },
			ctx,
		)) as Record<string, unknown>;

		const block = (result.content as Array<Record<string, unknown>>)[0];
		expect(block.markDefs).toMatchObject([{ _type: "link", href: "/posts/llm" }]);
	});

	it("ne touche à rien quand le terme a disparu du corps", async () => {
		const { ctx } = createMockCtx();
		const rewritten = {
			...withAccepted,
			content: [
				{
					_type: "block",
					_key: "b1",
					markDefs: [],
					children: [{ _type: "span", _key: "s1", text: "Texte réécrit", marks: [] }],
				},
			],
		};

		expect(
			await call("content:beforeSave", { content: rewritten, collection: "posts", isNew: false }, ctx),
		).toBeUndefined();
	});

	it("ignore une collection hors périmètre", async () => {
		const { ctx } = createMockCtx();
		expect(
			await call(
				"content:beforeSave",
				{ content: withAccepted, collection: "pages", isNew: false },
				ctx,
			),
		).toBeUndefined();
	});

	it("est idempotent sur deux enregistrements successifs", async () => {
		const { ctx } = createMockCtx();
		const first = (await call(
			"content:beforeSave",
			{ content: withAccepted, collection: "posts", isNew: false },
			ctx,
		)) as Record<string, unknown>;

		expect(
			await call("content:beforeSave", { content: first, collection: "posts", isNew: false }, ctx),
		).toBeUndefined();
	});

	it("n'empêche jamais l'enregistrement quand l'analyse échoue", async () => {
		const { ctx, logs } = createMockCtx();
		// `content` non tableau : `toLinkerEntry` le rend vide, et rien ne doit
		// remonter jusqu'à l'appelant.
		const corrupt = { ...withAccepted, content: { pas: "un tableau" } };

		expect(
			await call("content:beforeSave", { content: corrupt, collection: "posts", isNew: false }, ctx),
		).toBeUndefined();
		expect(logs.filter((entry) => entry.level === "error")).toEqual([]);
	});
});
