import fs from "node:fs"
import path from "node:path"

const POSTS_DIR = "./src/content/posts"

// Map each post URL path (/posts/<id>/) to its last modified date, read from
// the front-matter. astro.config.mjs cannot use astro:content, so this parses
// the files directly. Drafts are skipped; they are not built.
export function postLastModified() {
  const dates = new Map()
  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!/\.md$/i.test(file)) continue
    const fm = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8").split(/^---\s*$/m)[1] ?? ""
    if (/^draft:\s*true\s*$/m.test(fm)) continue
    const date = key => fm.match(new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, "m"))?.[1]
    const last = date("updated") ?? date("published")
    // Astro's glob loader lowercases the file name to build the post id
    if (last) dates.set(`/posts/${file.replace(/\.md$/i, "").toLowerCase()}/`, new Date(last))
  }
  return dates
}
