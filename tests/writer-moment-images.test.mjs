import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { parse } from "yaml";

const main = fileURLToPath(new URL("../src/content/.obsidian/plugins/shirone-writer/main.js", import.meta.url));
const require = createRequire(main);
const requests = [];
const notices = [];
let respond = () => ({ status: 200, json: { url: "https://img.example.com/x.webp" } });
class TFile {
	constructor(path) {
		this.path = path;
		this.name = path.split("/").pop();
		this.basename = this.name.replace(/\.[^.]+$/, "");
		this.extension = this.name.split(".").pop();
		const dir = path.split("/").slice(0, -1).join("/");
		this.parent = { path: dir || "/", name: dir.split("/").pop() };
	}
}
const module = { exports: {} };
vm.runInNewContext(readFileSync(main, "utf8"), {
	module,
	require: (id) => id === "obsidian" ? {
		Modal: class {}, Plugin: class {}, PluginSettingTab: class {}, Setting: class {}, TFile,
		Notice: class { constructor(message) { notices.push(message); } hide() {} },
		normalizePath: (path) => path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, ""),
		requestUrl: async (request) => { requests.push(request); return respond(request); },
		parseYaml: parse,
	} : require(id),
	window: { setTimeout, clearTimeout },
	Date, Intl, URL, Map, Set, Promise, Error, console,
});
const Writer = module.exports;
const { uploadQuery, uploadImage, momentImageLinks, rewriteMomentImages, appendMomentImages } = Writer.helpers;
// Objects built inside the vm context have other prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const settings = { kuroneUrl: "https://kurone.example.com/", githubToken: "token", postsFolder: "posts", momentsFolder: "moments", uploadImages: true };

test("upload query targets a post path or a moment id", () => {
	assert.equal(uploadQuery({ post: "my post/index.md" }), "post=my%20post%2Findex.md");
	assert.equal(uploadQuery({ moment: "2026-10-23-193015" }), "moment=2026-10-23-193015");
	assert.throws(() => uploadQuery({ moment: "a/b" }), /动态文件名/);
	assert.throws(() => uploadQuery({ moment: "" }), /动态文件名/);
	assert.throws(() => uploadQuery({}), /上传目标/);
});

test("uploadImage posts the bytes to the moment or post upload endpoint", async () => {
	requests.length = 0;
	const bytes = new Uint8Array([1, 2, 3]).buffer;
	assert.equal(await uploadImage(settings, { moment: "2026-10-23-193015" }, bytes, "image/webp"), "https://img.example.com/x.webp");
	await uploadImage(settings, { post: "hello.md" }, bytes, "image/webp");
	assert.deepEqual(requests.map((r) => r.url), [
		"https://kurone.example.com/api/upload?moment=2026-10-23-193015",
		"https://kurone.example.com/api/upload?post=hello.md",
	]);
	assert.equal(requests[0].contentType, "image/webp");
	assert.equal(requests[0].headers.Authorization, "Bearer token");
});

test("moment image helpers find local entries and rewrite them in place", () => {
	const images = [
		{ src: "https://img.example.com/a.webp" },
		{ src: "/images/moments/old.webp", alt: "old" },
		{ src: "../_attachments/2026-10-23-193015/my%20photo.png", alt: "photo", extra: 1 },
		{ src: "./note.txt" },
		"not-an-object",
	];
	assert.deepEqual(plain(momentImageLinks(images)), [
		{ src: "../_attachments/2026-10-23-193015/my%20photo.png", target: "../_attachments/2026-10-23-193015/my photo.png" },
	]);
	assert.deepEqual(plain(momentImageLinks(undefined)), []);
	const rewritten = rewriteMomentImages(images, new Map([[images[2].src, "https://img.example.com/b.webp"]]));
	assert.deepEqual(plain(rewritten[2]), { src: "https://img.example.com/b.webp", alt: "photo", extra: 1 });
	assert.deepEqual(plain(rewritten.filter((_, i) => i !== 2)), images.filter((_, i) => i !== 2));
	assert.deepEqual(plain(appendMomentImages(undefined, ["a", "b"])), [{ src: "a" }, { src: "b" }]);
	assert.deepEqual(plain(appendMomentImages([{ src: "x", alt: "y" }], ["a"])), [{ src: "x", alt: "y" }, { src: "a" }]);
});

function writerWith(files, frontmatter) {
	const writer = new Writer();
	writer.settings = { ...settings };
	const trashed = [];
	const byPath = new Map(files.map((path) => [path, new TFile(path)]));
	writer.app = {
		vault: {
			read: async () => "---\npublished: 2026-10-23\n---\nBody\n",
			readBinary: async () => new Uint8Array([1]).buffer,
			getAbstractFileByPath: (path) => byPath.get(path) ?? null,
			process: async () => assert.fail("moment body must not change"),
		},
		metadataCache: { getFileCache: () => ({ frontmatter }), getFirstLinkpathDest: () => null },
		fileManager: {
			processFrontMatter: async (_, update) => update(frontmatter),
			trashFile: async (file) => trashed.push(file.path),
		},
	};
	return { writer, trashed };
}

test("moment local images upload with the moment id and become absolute urls", async () => {
	requests.length = 0;
	const frontmatter = {
		images: [
			{ src: "../_attachments/2026-10-23-193015/a.png", alt: "first" },
			{ src: "https://img.example.com/kept.webp" },
			{ src: "../_attachments/2026-10-23-193015/b.jpg" },
		],
	};
	const { writer, trashed } = writerWith(
		["moments/2026-10-23-193015.md", "_attachments/2026-10-23-193015/a.png", "_attachments/2026-10-23-193015/b.jpg"],
		frontmatter,
	);
	let n = 0;
	respond = () => ({ status: 200, json: { url: `https://img.example.com/moments/2026-10-23-193015/${++n}.webp` } });
	const note = new TFile("moments/2026-10-23-193015.md");
	assert.equal(writer.isMoment(note), true);
	assert.equal(writer.isMoment(new TFile("moments/sub/x.md")), false);
	assert.equal(writer.isPostEntry(note), false);
	const result = await writer.uploadLocalImages(note);
	assert.deepEqual(plain(result), { uploaded: 2, failed: 0, error: "" });
	assert.ok(requests.every((r) => r.url.endsWith("/api/upload?moment=2026-10-23-193015")));
	assert.deepEqual(plain(frontmatter.images), [
		{ src: "https://img.example.com/moments/2026-10-23-193015/1.webp", alt: "first" },
		{ src: "https://img.example.com/kept.webp" },
		{ src: "https://img.example.com/moments/2026-10-23-193015/2.webp" },
	]);
	assert.deepEqual(trashed, ["_attachments/2026-10-23-193015/a.png", "_attachments/2026-10-23-193015/b.jpg"]);
});

test("pasted moment images append to frontmatter in paste order and fall back to attachments", async () => {
	const frontmatter = { images: [{ src: "https://img.example.com/old.webp" }] };
	const { writer } = writerWith(["moments/2026-10-23-193015.md"], frontmatter);
	const saved = [];
	writer.saveAttachment = async (_, name) => {
		const file = new TFile(`_attachments/2026-10-23-193015/${name}`);
		saved.push(file.path);
		return file;
	};
	// The first upload resolves last; order must still follow the paste.
	respond = (request) => {
		const tag = new Uint8Array(request.body)[0];
		if (tag === 3) return { status: 502, json: { error: "R2 down" } };
		return new Promise((resolve) => setTimeout(() => resolve({ status: 200, json: { url: `https://img.example.com/${tag}.webp` } }), tag === 1 ? 20 : 0));
	};
	const image = (tag, name) => ({ name, type: "image/gif", arrayBuffer: async () => new Uint8Array([tag]).buffer });
	let prevented = false;
	const evt = { defaultPrevented: false, type: "paste", preventDefault: () => { prevented = true; } };
	const editor = { replaceSelection: () => assert.fail("moment body must not change") };
	notices.length = 0;
	await writer.onEditorFiles(evt, { files: [image(1, "a.gif"), image(2, "b.gif"), image(3, "c.gif")] }, editor, { file: new TFile("moments/2026-10-23-193015.md") });
	assert.equal(prevented, true);
	assert.deepEqual(plain(frontmatter.images), [
		{ src: "https://img.example.com/old.webp" },
		{ src: "https://img.example.com/1.webp" },
		{ src: "https://img.example.com/2.webp" },
		{ src: "../_attachments/2026-10-23-193015/c.gif" },
	]);
	assert.deepEqual(saved, ["_attachments/2026-10-23-193015/c.gif"]);
	assert.match(notices[0], /正在上传 3 张图片/);
	assert.ok(notices.some((message) => /图片上传失败：R2 down/.test(message)));
});
