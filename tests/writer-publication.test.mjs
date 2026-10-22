import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { parseFrontmatter as astroParse } from "astro/markdown";
import { z } from "astro/zod";
import { parse } from "yaml";
import rss from "@astrojs/rss";

const require = createRequire(import.meta.url);
const dir = new URL("../src/content/.obsidian/plugins/shirone-writer/", import.meta.url);
const { preparePublication, publicationFields } = require(new URL("publication.cjs", dir).pathname.replace(/^\/(\w:)/, "$1"));
const { planPublication, renames } = require(new URL("git-publication.cjs", dir).pathname.replace(/^\/(\w:)/, "$1"));
const parsePost = (text) => parse(/^---\r?\n([\s\S]*?)\r?\n---/.exec(text)[1]);
const now = new Date("2026-10-22T16:12:34.987Z");
const draft = "---\ntitle: Test\npublished: 2020-01-01\ndraft: true\ncustom: [kept, field]\n---\nBody\n";
const live = (text = draft) => text.replace("draft: true", "draft: false");
const prepare = (text, baseline, extra = {}) => preparePublication({ text, baseline, timeZone: "Asia/Shanghai", now, parse: parsePost, ...extra });

test("drafts do not receive a first time; new and draft-to-public posts do", () => {
	assert.equal(prepare(draft, null), draft);
	for (const baseline of [null, draft]) {
		const result = prepare(live(), baseline);
		assert.equal(parsePost(result).published, "2026-10-23");
		assert.equal(parsePost(result).publishedAt, "2026-10-22T16:12:34Z");
		assert.deepEqual(parsePost(result).custom, ["kept", "field"]);
		assert.ok(result.endsWith("Body\n"));
		assert.equal(prepare(result, baseline, { now: new Date("2030-01-01") }), result);
	}
});

test("legacy edits, historical imports, existing times and withdrawals keep their intent", () => {
	assert.equal(prepare(live(), live()), live());
	const historical = publicationFields(live(), { preservePublishedDate: true });
	assert.equal(prepare(historical, null), historical);
	const exact = publicationFields(live(), { publishedAt: "2020-01-01T09:12:34+08:00" });
	assert.equal(prepare(exact, draft), exact);
	const withdrawn = prepare(draft, live());
	assert.equal(parsePost(withdrawn).preservePublishedDate, true);
	assert.equal(prepare(live(withdrawn), withdrawn), live(withdrawn));
	assert.equal(parsePost(prepare(live(), exact)).publishedAt, "2020-01-01T09:12:34+08:00");
});

test("ambiguous baseline and invalid zoned instants stop; calendar dates use the site zone", () => {
	assert.throws(() => prepare(live(), undefined), /publication.baseline/);
	assert.equal(parsePost(prepare(live(), null, { timeZone: "America/Los_Angeles" })).published, "2026-10-22");
	for (const publishedAt of ["2020-01-01T09:30:00", "2020-01-02T09:30:00Z", "bad"]) {
		assert.throws(() => prepare(publicationFields(live(), { publishedAt }), draft), /publishedAt/);
	}
	assert.throws(() => prepare(publicationFields(live(), { updatedAt: "2020-01-01T09:30:00Z" }), draft), /updatedAt/);
});

test("quoted keys and js-yaml Date scalars retain valid Astro timestamps", () => {
	const dateParse = (text) => astroParse(text).frontmatter;
	const source = live().replace("published: 2020-01-01", '"published": "2020-01-01"\n"publishedAt": 2020-01-01T09:12:34+08:00');
	const output = prepare(source, draft, { parse: dateParse });
	assert.ok(astroParse(output).frontmatter.publishedAt instanceof Date);
	assert.ok(output.includes("publishedAt: 2020-01-01T09:12:34+08:00"));
	assert.equal(astroParse(output).frontmatter.publishedAt.toISOString(), "2020-01-01T01:12:34.000Z");
});

function loadModule(file, stub) {
	const source = readFileSync(file, "utf8");
	const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
	const module = { exports: {} };
	vm.runInNewContext(code, { module, exports: module.exports, require: stub, Date, Intl, URL, console });
	return module.exports;
}

test("written YAML passes the actual Astro parser, both schemas, date guard and RSS/Atom timestamp chain", async () => {
	const schemaStub = (name) => {
		if (name === "astro:content") return { defineCollection: (value) => value };
		if (name === "astro/loaders") return { glob: (value) => value };
		if (name === "astro/zod") return { z };
		throw new Error(name);
	};
	const source = loadModule(new URL("../src/content.config.ts", import.meta.url), schemaStub).collections.posts.schema;
	const packaged = loadModule(new URL("../src/integration/collections.ts", import.meta.url), schemaStub).postSchema;
	const dates = loadModule(new URL("../src/utils/content-date.ts", import.meta.url), () => ({ siteConfig: { timeZone: "Asia/Shanghai" } }));
	let posts = [];
	const feed = loadModule(new URL("../src/utils/feed.ts", import.meta.url), (name) => {
		if (name === "@utils/content-date") return dates;
		if (name === "@utils/content-utils") return { getSortedPosts: async () => posts };
		if (name === "@utils/post-encryption") return { isEncryptedPost: () => true };
		if (name === "@utils/url-utils") return { getPostUrl: () => "/posts/test/" };
		if (name === "@i18n/translation") return { i18n: () => "Encrypted" };
		if (name === "@i18n/i18nKey") return { default: {} };
		if (name === "markdown-it") return class {};
		return {};
	});
	for (const output of [prepare(live(), draft), prepare(publicationFields(live(), { publishedAt: "2020-01-01T09:12:34+08:00" }), draft)]) {
		const { frontmatter } = astroParse(output);
		for (const schema of [source, packaged]) {
			const data = schema.parse(frontmatter);
			dates.validatePublicationMetadata({ id: "writer", data }, "Asia/Shanghai");
			const instant = dates.getPublishedInstant(data);
			assert.equal(instant.toISOString(), frontmatter.publishedAt.toISOString());
			assert.equal(dates.getUpdatedInstant(data).toISOString(), instant.toISOString());
			assert.ok(!instant.toUTCString().includes("00:00:00 GMT"));
			posts = [{ id: "test", data }];
			const items = await feed.getFeedPosts(new URL("https://example.invalid"));
			assert.equal(items[0].pubDate.toISOString(), instant.toISOString());
			const response = await rss({ title: "Test", description: "Test", site: "https://example.invalid", items });
			assert.ok((await response.text()).includes(`<pubDate>${instant.toUTCString()}</pubDate>`));
			const atom = feed.buildAtomXml({ title: "Test", subtitle: "Test", lang: "en", author: "Test", siteUrl: "https://example.invalid", feedUrl: "https://example.invalid/atom.xml", items });
			assert.ok(atom.includes(`<published>${instant.toISOString()}</published>`));
		}
	}
});

function gitFixture({ remote = draft, head = draft, rename = false, deleted = false } = {}) {
	return async (args) => {
		const command = args.join(" ");
		if (command === "rev-parse --verify @{upstream}") return "remote\n";
		if (command === "rev-parse --verify HEAD") return "local\n";
		if (args[0] === "merge-base") return "";
		if (args[0] === "ls-tree") return (args.at(-1) === "remote" ? remote && "posts/old.md\0" : head && "posts/a.md\0") || "";
		if (args[0] === "diff") return command.endsWith("remote local") ? rename ? "R100\0posts/old.md\0posts/a.md\0" : deleted ? "D\0posts/old.md\0" : "" : "";
		if (args[0] === "show") return args[1].startsWith("remote:") ? remote : head;
		throw new Error(command);
	};
}

test("upstream and HEAD distinguish renamed old posts, uncommitted drafts and automatic commits", async () => {
	const files = [{ path: "posts/a.md", text: live() }];
	let result = await planPublication({ raw: gitFixture({ rename: true }), files, parse: parsePost, timeZone: "Asia/Shanghai", now });
	assert.equal(result.plans.length, 1);
	result = await planPublication({ raw: gitFixture({ remote: live(), head: live(), rename: true }), files, parse: parsePost, timeZone: "Asia/Shanghai", now });
	assert.equal(result.plans.length, 0);
	await assert.rejects(planPublication({ raw: gitFixture({ remote: null, head: live() }), files, parse: parsePost, timeZone: "Asia/Shanghai", now }), /本地 commit/);
	await assert.rejects(planPublication({ raw: gitFixture({ remote: null, head: null, deleted: true }), files, parse: parsePost, timeZone: "Asia/Shanghai", now }), /baseline/);
	assert.deepEqual([...renames("R100\0old name.md\0new name.md\0").map], [["new name.md", "old name.md"]]);
});
