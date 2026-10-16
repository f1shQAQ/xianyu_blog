import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { collectLocalIcons } from "../src/integration/vite/icon/collections.ts";

const dir = mkdtempSync(join(tmpdir(), "shirones-local-icons-"));

after(() => {
	rmSync(dir, { recursive: true, force: true });
});

test("a missing directory yields no collection", () => {
	assert.equal(collectLocalIcons(join(dir, "absent")), null);
});

test("an empty directory yields no collection", () => {
	mkdirSync(join(dir, "empty"), { recursive: true });
	assert.equal(collectLocalIcons(join(dir, "empty")), null);
});

test("a directory holding only non-SVG files yields no collection", () => {
	mkdirSync(join(dir, "no-svg"), { recursive: true });
	writeFileSync(join(dir, "no-svg", "notes.txt"), "not an icon");
	assert.equal(collectLocalIcons(join(dir, "no-svg")), null);
});

test("an SVG becomes a local-prefixed icon", () => {
	const target = join(dir, "one");
	mkdirSync(target, { recursive: true });
	writeFileSync(
		join(target, "star.svg"),
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4l1.5-7.5L2 9h7z"/></svg>',
	);
	const collection = collectLocalIcons(target);
	assert.ok(collection);
	assert.equal(collection.prefix, "local");
	assert.deepEqual(Object.keys(collection.icons), ["star"]);
	const icon = collection.icons.star;
	assert.equal(icon.width, 24);
	assert.equal(icon.height, 24);
	assert.match(String(icon.body), /<path/);
});

test("viewBox drives the dimensions when width/height disagree", () => {
	const target = join(dir, "viewbox");
	mkdirSync(target, { recursive: true });
	writeFileSync(
		join(target, "box.svg"),
		'<svg width="999" height="999" viewBox="0 0 32 16"><rect width="32" height="16"/></svg>',
	);
	const icon = collectLocalIcons(target)?.icons.box;
	assert.ok(icon);
	assert.equal(icon.width, 32);
	assert.equal(icon.height, 16);
});

test("width and height attributes are used when there is no viewBox", () => {
	const target = join(dir, "dims");
	mkdirSync(target, { recursive: true });
	writeFileSync(
		join(target, "dot.svg"),
		'<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px"><circle r="8"/></svg>',
	);
	const icon = collectLocalIcons(target)?.icons.dot;
	assert.ok(icon);
	assert.equal(icon.width, 16);
	assert.equal(icon.height, 16);
});

test("a file with no geometry is dropped, not fatal", () => {
	const target = join(dir, "partial");
	mkdirSync(target, { recursive: true });
	writeFileSync(join(target, "good.svg"), '<svg viewBox="0 0 8 8"><path d="M0 0h8v8H0z"/></svg>');
	// No width, height or viewBox: nothing to size it by.
	writeFileSync(join(target, "bad.svg"), '<svg><path d="M0 0h8v8H0z"/></svg>');
	// An empty svg carries no artwork.
	writeFileSync(join(target, "blank.svg"), '<svg viewBox="0 0 8 8"></svg>');
	const collection = collectLocalIcons(target);
	assert.deepEqual(Object.keys(collection.icons), ["good"]);
});

test("a single-quoted, oddly spaced svg still parses", () => {
	const target = join(dir, "spacing");
	mkdirSync(target, { recursive: true });
	writeFileSync(
		join(target, "odd.svg"),
		"<svg  xmlns = 'http://www.w3.org/2000/svg'   viewBox='0 0 20 20' ><path d='M0 0h20v20H0z'/></svg>",
	);
	const icon = collectLocalIcons(target)?.icons.odd;
	assert.ok(icon);
	assert.equal(icon.width, 20);
	assert.match(String(icon.body), /<path/);
});

test("the extension is stripped from the name, case-insensitively", () => {
	const target = join(dir, "ext");
	mkdirSync(target, { recursive: true });
	writeFileSync(join(target, "Bell.SVG"), '<svg viewBox="0 0 8 8"><path d="M0 0h8z"/></svg>');
	const collection = collectLocalIcons(target);
	assert.deepEqual(Object.keys(collection.icons), ["Bell"]);
});
