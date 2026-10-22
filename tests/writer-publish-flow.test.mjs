import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { parse } from "yaml";
import { parseFrontmatter } from "astro/markdown";

const main = fileURLToPath(new URL("../src/content/.obsidian/plugins/shirone-writer/main.js", import.meta.url));
const require = createRequire(main);
const draft = "---\ntitle: Test\npublished: 2020-01-01\ndraft: true\naiSummary: Summary\ncustom: preserved\n---\nBody\n";
const live = draft.replace("draft: true", "draft: false");
const notices = [];
let reviewDecision = true;
let reviewHook = () => {};
class Modal {
	constructor() {
		this.titleEl = { setText() {} };
		this.contentEl = { createEl() {}, empty() {} };
	}
	open() { reviewHook(this); if (reviewDecision) this.confirmed = true; this.onClose(); if (reviewDecision) this.resolve?.(true); }
}
const module = { exports: {} };
vm.runInNewContext(readFileSync(main, "utf8"), {
	module,
	require: (id) => id === "obsidian" ? {
		Modal, Notice: class { constructor(message) { notices.push(message); } },
		Plugin: class {}, PluginSettingTab: class {}, Setting: class {}, TFile: class {},
		parseYaml: parse,
	} : require(id),
	Date, Intl, URL, Map, Set, console,
});
const Writer = module.exports;

function setup(t) {
	const root = mkdtempSync(path.join(tmpdir(), "shirone-writer-flow-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const repo = path.join(root, "repo");
	const remote = path.join(root, "remote.git");
	mkdirSync(repo);
	const git = (args) => execFileSync("git", ["-c", `safe.directory=${repo}`, ...args], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	git(["init", "--initial-branch=main"]);
	git(["config", "user.name", "Writer test"]);
	git(["config", "user.email", "writer@example.invalid"]);
	git(["config", "commit.gpgsign", "false"]);
	git(["config", "core.autocrlf", "false"]);
	mkdirSync(path.join(repo, "content/posts"), { recursive: true });
	mkdirSync(path.join(repo, "src/config"), { recursive: true });
	writeFileSync(path.join(repo, "src/config/siteConfig.ts"), 'export const siteConfig = {\n timeZone: "Asia/Shanghai",\n};');
	const file = { path: "posts/test.md" };
	const fullPath = path.join(repo, "content", file.path);
	writeFileSync(fullPath, draft);
	git(["add", "."]);
	git(["commit", "-m", "seed draft"]);
	git(["init", "--bare", remote]);
	git(["remote", "add", "origin", remote]);
	git(["push", "-u", "origin", "main"]);
	writeFileSync(fullPath, live);
	const writer = new Writer();
	writer.manifest = { id: "shirone-writer", dir: path.dirname(main) };
	writer.settings = { gitCommandId: "obsidian-git:push", publicationTimeZone: "", uploadImages: false };
	writer.isPostEntry = () => true;
	writer.postsMissingSummary = () => [];
	const events = [];
	const adapter = {
		settings: {}, isAllInitialized: async () => true,
		gitManager: { git: { raw: async (args) => git(args) } },
		promiseQueue: { addTask: async (task) => task() },
		gitActions: {
			fetch: async () => { git(["fetch"]); return { status: "success", value: { status: "fetched" } }; },
			commit: async () => {
				events.push("commit");
				git(["add", "--all"]);
				if (git(["diff", "--cached", "--name-only"]).trim()) git(["commit", "-m", "publication"]);
				return { status: "success", value: { status: "committed" } };
			},
			push: async () => { events.push("push"); git(["push"]); return { status: "success", value: { status: "pushed" } }; },
		},
	};
	writer.app = {
		plugins: { getPlugin: () => adapter },
		vault: {
			adapter: { getBasePath: () => path.join(repo, "content") },
			getMarkdownFiles: () => [file],
			read: async () => readFileSync(fullPath, "utf8"),
			modify: async (_, text) => { events.push("write"); writeFileSync(fullPath, text); },
			process: async (_, update) => { events.push("write"); writeFileSync(fullPath, update(readFileSync(fullPath, "utf8"))); },
		},
	};
	reviewDecision = true;
	reviewHook = () => {};
	notices.length = 0;
	return { writer, adapter, git, fullPath, events };
}

test("Writer writes before commit, pushes the commit with metadata, and preserves times on retry", async (t) => {
	const { writer, git, fullPath, events } = setup(t);
	await writer.checkAndPush();
	assert.deepEqual(events, ["write", "commit", "push"]);
	const content = readFileSync(fullPath, "utf8");
	const { frontmatter } = parseFrontmatter(content);
	assert.ok(frontmatter.publishedAt instanceof Date);
	assert.equal(git(["show", "origin/main:content/posts/test.md"]), content);
	await writer.checkAndPush();
	assert.equal(readFileSync(fullPath, "utf8"), content);
	assert.equal(notices.length, 0);
});

test("cancelling publication review writes nothing and does not commit or push", async (t) => {
	const { writer, fullPath, events } = setup(t);
	reviewDecision = false;
	await writer.checkAndPush();
	assert.equal(readFileSync(fullPath, "utf8"), live);
	assert.deepEqual(events, []);
	assert.equal(writer.workflowBusy, false);
});

test("commit cancellation restores file and its previous staged index, and never pushes", async (t) => {
	const { writer, adapter, fullPath, git, events } = setup(t);
	git(["add", "content/posts/test.md"]);
	const index = git(["show", ":content/posts/test.md"]);
	adapter.gitActions.commit = async () => {
		git(["add", "--all"]);
		return { status: "cancelled" };
	};
	await writer.checkAndPush();
	assert.equal(readFileSync(fullPath, "utf8"), live);
	assert.equal(git(["show", ":content/posts/test.md"]), index);
	assert.ok(!events.includes("push"));
	assert.match(notices.at(-1), /提交取消或失败/);
});

test("failed push retains committed exact time and retry does not stamp again", async (t) => {
	const { writer, adapter, fullPath, events } = setup(t);
	const push = adapter.gitActions.push;
	adapter.gitActions.push = async () => ({ status: "failed" });
	await writer.checkAndPush();
	const content = readFileSync(fullPath, "utf8");
	assert.ok(parseFrontmatter(content).frontmatter.publishedAt instanceof Date);
	assert.match(notices.at(-1), /推送未完成/);
	adapter.gitActions.push = push;
	await writer.checkAndPush();
	assert.equal(readFileSync(fullPath, "utf8"), content);
	assert.equal(events.filter((v) => v === "write").length, 1);
});

test("a local automatic publication commit, missing upstream or concurrent edit stops before writes", async (t) => {
	const { writer, git, fullPath, events } = setup(t);
	git(["add", "--all"]);
	git(["commit", "-m", "background commit without time"]);
	await writer.checkAndPush();
	assert.match(notices.at(-1), /本地 commit/);
	assert.deepEqual(events, []);
	git(["reset", "--soft", "HEAD~1"]);
	reviewHook = () => writeFileSync(fullPath, live + "concurrent edit");
	await writer.checkAndPush();
	assert.match(notices.at(-1), /审阅期间/);
	assert.deepEqual(events, []);
	reviewHook = () => {};
	git(["branch", "--unset-upstream"]);
	await writer.checkAndPush();
	assert.deepEqual(events, []);
});

test("a second Writer invocation cannot bypass an active review or image workflow", async (t) => {
	const { writer, adapter, events } = setup(t);
	let release;
	adapter.gitActions.fetch = () => new Promise((resolve) => { release = () => resolve({ status: "success", value: { status: "fetched" } }); });
	const first = writer.checkAndPush();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(writer.workflowBusy, true);
	await writer.checkAndPush();
	release();
	await first;
	assert.equal(events.filter((v) => v === "commit").length, 1);
});
