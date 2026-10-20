import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Map each post URL path (/posts/<id>/) to its last modified date, read from
 * the front-matter (`updated`, else `published`). The integration runs before
 * astro:content exists, so this parses the files directly. Drafts are skipped;
 * they are not built. Only covers the default /posts/<id>/ routes, not custom
 * permalinks.
 */
export function postLastModified(postsDir: string): Map<string, Date> {
	const dates = new Map<string, Date>();
	if (!existsSync(postsDir)) return dates;
	for (const file of readdirSync(postsDir)) {
		if (!/\.mdx?$/i.test(file)) continue;
		const fm =
			readFileSync(join(postsDir, file), "utf-8").split(/^---\s*$/m)[1] ?? "";
		if (/^draft:\s*true\s*$/m.test(fm)) continue;
		const date = (key: string) =>
			fm.match(new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, "m"))?.[1];
		const last = date("updated") ?? date("published");
		// Astro's glob loader lowercases the file name to build the post id
		if (last)
			dates.set(
				`/posts/${file.replace(/\.mdx?$/i, "").toLowerCase()}/`,
				new Date(last),
			);
	}
	return dates;
}
