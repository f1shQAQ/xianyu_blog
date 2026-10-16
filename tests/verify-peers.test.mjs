import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import {
	PEER_REQUIREMENTS,
	reportPeerViolations,
	verifyPeerRequirements,
} from "../src/integration/verify-peers.ts";

const packageRoot = mkdtempSync(join(tmpdir(), "shirones-peers-theme-"));
const projectRoot = mkdtempSync(join(tmpdir(), "shirones-peers-project-"));

after(() => {
	rmSync(packageRoot, { recursive: true, force: true });
	rmSync(projectRoot, { recursive: true, force: true });
});

/**
 * Every range comes from the theme's manifest, so the fixture has to provide
 * one — the same shape the packaging pipeline publishes.
 */
function writeThemeManifest(dependencies) {
	writeFileSync(
		join(packageRoot, "package.json"),
		`${JSON.stringify({ peerDependencies: dependencies }, null, 2)}\n`,
	);
}

function writeProjectPackage(dependencies, devDependencies) {
	writeFileSync(
		join(projectRoot, "package.json"),
		`${JSON.stringify(
			{ name: "site", dependencies, ...(devDependencies ? { devDependencies } : {}) },
			null,
			2,
		)}\n`,
	);
}

function reset() {
	writeThemeManifest({});
	writeProjectPackage({});
}

/** Capture what the logger was told, in order. */
function makeLogger() {
	const errors = [];
	const warnings = [];
	return {
		errors,
		warnings,
		logger: {
			error: (message) => errors.push(message),
			warn: (message) => warnings.push(message),
		},
	};
}

test("no manifest in the project is not a violation", () => {
	reset();
	rmSync(join(projectRoot, "package.json"), { force: true });
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.deepEqual(violations, []);
});

test("source mode skips the check entirely", () => {
	reset();
	const violations = verifyPeerRequirements({ packageRoot, projectRoot, skip: true });
	assert.deepEqual(violations, []);
	const { logger, errors, warnings } = makeLogger();
	assert.equal(reportPeerViolations(violations, logger), false);
	assert.deepEqual(errors, []);
	assert.deepEqual(warnings, []);
});

test("a project that declares everything reports nothing", () => {
	writeThemeManifest({
		astro: "^7.3.5",
		svelte: "^5.57.1",
		"@astrojs/svelte": "^9.0.1",
		sharp: "^0.35.5",
		"@iconify-json/material-symbols": "^1.2.93",
		"@iconify-json/fa7-brands": "^1.2.4",
		"@iconify-json/fa7-solid": "^1.2.5",
		"@iconify-json/simple-icons": "^1.2.98",
		"@astrojs/check": "^0.9.10",
		typescript: "^6.0.3",
	});
	writeProjectPackage(
		{
			astro: "^7.3.5",
			svelte: "^5.57.1",
			"@astrojs/svelte": "^9.0.1",
			sharp: "^0.35.5",
			"@iconify-json/material-symbols": "^1.2.93",
			"@iconify-json/fa7-brands": "^1.2.4",
			"@iconify-json/fa7-solid": "^1.2.5",
			"@iconify-json/simple-icons": "^1.2.98",
		},
		{ "@astrojs/check": "^0.9.10", typescript: "^6.0.3" },
	);
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.deepEqual(violations, []);
});

test("a missing runtime peer is an error, a missing tooling peer is not", () => {
	reset();
	writeThemeManifest({
		astro: "^7.3.5",
		typescript: "^6.0.3",
	});
	writeProjectPackage({}, {});
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	// Both fixtures carry a range, so both are reported — but only one of them
	// may stop the build.
	assert.equal(violations.length, 2);
	assert.equal(violations[0].name, "astro");
	assert.equal(violations[0].tier, "runtime");
	assert.equal(violations[0].reason, "the project's `astro.config.mjs` imports it");
	assert.equal(violations[1].name, "typescript");
	assert.equal(violations[1].tier, "tooling");

	const { logger, errors, warnings } = makeLogger();
	assert.equal(reportPeerViolations(violations, logger), true);
	assert.equal(errors.length, 1);
	// The tooling gap is reported too, but as a warning that does not block.
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /astro check/);
	assert.match(errors[0], /astro/);
	assert.match(errors[0], /pnpm add -D|npm install -D/);
	assert.doesNotMatch(errors[0], /typescript/);
});

test("a tooling-only gap warns and does not stop the build", () => {
	reset();
	writeThemeManifest({ "@astrojs/check": "^0.9.10", typescript: "^6.0.3" });
	writeProjectPackage({}, {});
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.equal(violations.length, 2);
	assert.deepEqual(
		violations.map((violation) => violation.tier),
		["tooling", "tooling"],
	);

	const { logger, errors, warnings } = makeLogger();
	assert.equal(reportPeerViolations(violations, logger), false);
	assert.deepEqual(errors, []);
	assert.equal(warnings.length, 2);
	assert.match(warnings[0], /astro check/);
});

test("runtime violations sort ahead of tooling ones", () => {
	reset();
	writeThemeManifest({
		astro: "^7.3.5",
		typescript: "^6.0.3",
	});
	writeProjectPackage({}, {});
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	const order = violations.map((violation) => violation.tier);
	assert.deepEqual(order, ["runtime", "tooling"]);
});

test("a range that starts below the theme's floor is stale", () => {
	reset();
	writeThemeManifest({ sharp: "^0.35.5" });
	writeProjectPackage({ sharp: "^0.34.5" });
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.equal(violations.length, 1);
	assert.equal(violations[0].name, "sharp");
	assert.equal(violations[0].stale, true);
	assert.equal(violations[0].declared, "^0.34.5");
	assert.equal(violations[0].required, "^0.35.5");
});

test("a range with no floor is taken as satisfying", () => {
	reset();
	writeThemeManifest({ sharp: "^0.35.5" });
	writeProjectPackage({ sharp: "*" });
	assert.deepEqual(verifyPeerRequirements({ packageRoot, projectRoot }), []);
});

test("a devDependency satisfies the requirement as well as a dependency", () => {
	reset();
	writeThemeManifest({ sharp: "^0.35.5" });
	writeProjectPackage({}, { sharp: "^0.35.6" });
	assert.deepEqual(verifyPeerRequirements({ packageRoot, projectRoot }), []);
});

test("the reason text is shown with every error", () => {
	reset();
	writeThemeManifest({ svelte: "^5.57.1" });
	writeProjectPackage({});
	const { logger, errors } = makeLogger();
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	reportPeerViolations(violations, logger);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /optimizeDeps\.include/);
	assert.match(errors[0], /svelte@\^5\.57\.1/);
});

test("no iconify package is required of the project", () => {
	reset();
	writeThemeManifest({
		"@iconify-json/material-symbols": "^1.2.93",
		"@iconify-json/fa7-brands": "^1.2.4",
	});
	writeProjectPackage({});
	// The sets ship as the theme's own dependencies now: they are resolved from
	// inside the installed package, so a project that declares none of them has
	// nothing to fix.
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.deepEqual(violations, []);
});

test("the error names the package manager and avoids a doubled prefix", () => {
	writeThemeManifest({
		astro: "^7.3.5",
		svelte: "^5.57.1",
	});
	writeProjectPackage({}, {});
	const { logger, errors } = makeLogger();
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	reportPeerViolations(violations, logger);
	assert.equal(errors.length, 1);
	// Astro prefixes every message with the integration name, so the message
	// itself must not repeat it.
	assert.doesNotMatch(errors[0], /^\[shirones\]/);
	assert.doesNotMatch(errors[0], /\[shirones\].*\[shirones\]/);
	// Two missing packages is plural, and the sentence has to agree.
	assert.match(errors[0], /2 required dependencies are missing/);
	assert.match(errors[0], /pnpm add -D|npm install -D/);
});

test("a single missing dependency keeps the singular verb", () => {
	writeThemeManifest({ astro: "^7.3.5" });
	writeProjectPackage({}, {});
	const { logger, errors } = makeLogger();
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	reportPeerViolations(violations, logger);
	assert.match(errors[0], /1 required dependency is missing/);
});

test("a stale runtime peer reports both versions", () => {
	writeThemeManifest({ sharp: "^0.35.5" });
	writeProjectPackage({ sharp: "^0.34.5" });
	const { logger, errors } = makeLogger();
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.equal(reportPeerViolations(violations, logger), true);
	assert.match(errors[0], /declares \^0\.34\.5, needs \^0\.35\.5/);
	assert.match(errors[0], /sharp@\^0\.35\.5/);
});

test("every requirement carries a reason the user can act on", () => {
	for (const requirement of PEER_REQUIREMENTS) {
		assert.ok(requirement.reason.length > 10, `${requirement.name} needs a reason`);
		assert.ok(
			requirement.tier === "runtime" || requirement.tier === "tooling",
			`${requirement.name} needs a known tier`,
		);
	}
});

test("an unreadable manifest does not crash the check", () => {
	reset();
	writeThemeManifest({ astro: "^7.3.5" });
	writeFileSync(join(projectRoot, "package.json"), "{ not json");
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	assert.deepEqual(violations, []);
});

test("the theme's own devDependencies answer for ranges in source shape", () => {
	reset();
	writeFileSync(
		join(packageRoot, "package.json"),
		`${JSON.stringify(
			{
				dependencies: { astro: "7.3.5" },
				devDependencies: { typescript: "^6.0.3" },
			},
			null,
			2,
		)}\n`,
	);
	writeProjectPackage({ astro: "7.3.2" });
	const violations = verifyPeerRequirements({ packageRoot, projectRoot });
	// astro is present and its floor is below the pin, so it is stale; the
	// devDependency range for typescript is found but the project does not
	// declare typescript, and a range it does not list is still a gap.
	assert.equal(violations.length, 2);
	assert.equal(violations[0].name, "astro");
	assert.equal(violations[0].stale, true);
	assert.equal(violations[1].name, "typescript");
	assert.equal(violations[1].stale, false);
});

test("a project with no package.json directory is not a crash", () => {
	reset();
	const empty = mkdtempSync(join(tmpdir(), "shirones-peers-empty-"));
	try {
		assert.deepEqual(verifyPeerRequirements({ packageRoot, projectRoot: empty }), []);
	} finally {
		rmSync(empty, { recursive: true, force: true });
	}
});
