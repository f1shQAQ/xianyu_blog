/** Desktop Obsidian Git adapter. All operations run inside its existing queue. */
const path = require("node:path");
const { preparePublication } = require("./publication.cjs");

function paths(output) {
	return output.split("\0").filter(Boolean);
}

function renames(output) {
	const fields = paths(output);
	const map = new Map();
	const deleted = new Set();
	for (let i = 0; i < fields.length;) {
		const status = fields[i++];
		const source = fields[i++];
		if (/^[RC]/.test(status)) {
			const target = fields[i++];
			if (status.startsWith("R")) map.set(target, source);
		} else if (status === "D") deleted.add(source);
	}
	return { map, deleted };
}

/** Use upstream as publication evidence, HEAD to detect unprepared local commits. */
async function publicationBaselines(raw, postPaths, parse) {
	const upstream = (await raw(["rev-parse", "--verify", "@{upstream}"])).trim();
	const head = (await raw(["rev-parse", "--verify", "HEAD"])).trim();
	await raw(["merge-base", "--is-ancestor", upstream, head]);
	const remotePaths = new Set(paths(await raw(["ls-tree", "-r", "-z", "--name-only", upstream])));
	const headPaths = new Set(paths(await raw(["ls-tree", "-r", "-z", "--name-only", head])));
	const committed = renames(await raw(["diff", "--name-status", "-z", "--find-renames", upstream, head]));
	const working = renames(await raw(["diff", "--name-status", "-z", "--find-renames", head]));
	const baselines = new Map();
	for (const file of postPaths) {
		const headPath = working.map.get(file) ?? file;
		const remotePath = committed.map.get(headPath) ?? headPath;
		const baseline = remotePaths.has(remotePath) ? await raw(["show", `${upstream}:${remotePath}`]) : null;
		const local = headPaths.has(headPath) ? await raw(["show", `${head}:${headPath}`]) : null;
		// Untracked moves cannot be proven by Git's rename detector. Do not invent a first time.
		const ambiguous = baseline === null && [...committed.deleted, ...working.deleted].some((p) => /\.mdx?$/.test(p));
		baselines.set(file, {
			baseline: ambiguous ? undefined : baseline,
			localPublic: local !== null && parse(local).draft !== true,
			local,
		});
	}
	return { baselines, head, upstream };
}

/** Build all changes before touching any vault file. */
async function planPublication({ raw, files, parse, timeZone, now = new Date() }) {
	const state = await publicationBaselines(raw, files.map((f) => f.path), parse);
	const plans = [];
	for (const file of files) {
		const evidence = state.baselines.get(file.path);
		const { localPublic, local } = evidence;
		// A completed local commit from an earlier failed push is also exact-time evidence.
		const baseline = local != null && parse(local).publishedAt ? local : evidence.baseline;
		const data = parse(file.text);
		const wasPublic = baseline != null && parse(baseline).draft !== true;
		if (localPublic && !wasPublic && data.draft !== true && !data.publishedAt && data.preservePublishedDate !== true) {
			throw new Error(`${file.path} 已在本地 commit 中发布但缺精确时间；请填写真实 publishedAt，或设置 preservePublishedDate: true 保留历史日期`);
		}
		try {
			const text = preparePublication({ text: file.text, baseline, timeZone, now, parse });
			if (text !== file.text) plans.push({ ...file, after: text });
		} catch (error) {
			throw new Error(`${file.path}: ${error.message}（时区 ${timeZone}；历史日期可用 preservePublishedDate: true）`);
		}
	}
	return { ...state, plans };
}

/** Reject custom git-dir/work-tree setups until they have an explicit adapter. */
function repoPathForVault(repoRoot, vaultRoot, file) {
	const relative = path.relative(repoRoot, path.join(vaultRoot, file));
	if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Vault 不在 Git 仓库内");
	return relative.split(path.sep).join("/");
}

module.exports = { planPublication, publicationBaselines, repoPathForVault, renames };
