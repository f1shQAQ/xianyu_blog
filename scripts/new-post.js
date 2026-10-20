/* Create a new post markdown file with front-matter.
 *
 * Interactive:   pnpm new-post
 * With options:  pnpm new-post <slug> [--title "标题"] [--desc "描述"]
 *                  [--category 折腾] [--tags 小米,降级] [--image <url>] [--publish]
 *
 * New posts are drafts (`draft: true`) unless --publish is given; drafts show
 * in `pnpm dev` but are left out of the production build.
 */

import fs from "node:fs"
import path from "node:path"
import readline from "node:readline/promises"
import { parseArgs } from "node:util"

const POSTS_DIR = "./src/content/posts/"

function today() {
  const d = new Date()
  const pad = n => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "Xiaomi 10S_downgrade" -> "Xiaomi-10S-downgrade"
function toSlug(input) {
  return input
    .trim()
    .replace(/\.(md|mdx)$/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function validSlug(slug) {
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(slug)
}

function slugTaken(slug) {
  // Post URLs are case-insensitive in practice, so compare lowercased
  const lower = slug.toLowerCase()
  return fs
    .readdirSync(POSTS_DIR)
    .some(f => f.replace(/\.(md|mdx)$/i, "").toLowerCase() === lower)
}

// Collect categories and tags already used, so new posts reuse them
function existingTaxonomy() {
  const categories = new Map()
  const tags = new Map()
  for (const f of fs.readdirSync(POSTS_DIR)) {
    if (!/\.(md|mdx)$/i.test(f)) continue
    const fm = fs.readFileSync(path.join(POSTS_DIR, f), "utf-8").split(/^---\s*$/m)[1] ?? ""
    const cat = fm.match(/^category:\s*['"]?([^'"\r\n]*)['"]?\s*$/m)?.[1]?.trim()
    if (cat) categories.set(cat, (categories.get(cat) ?? 0) + 1)
    const tagList = fm.match(/^tags:\s*\[(.*)\]\s*$/m)?.[1] ?? ""
    for (const t of tagList.split(",").map(s => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean))
      tags.set(t, (tags.get(t) ?? 0) + 1)
  }
  const byCount = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  return { categories: byCount(categories), tags: byCount(tags) }
}

const yamlStr = s => `'${String(s).replace(/'/g, "''")}'`
const splitList = s => (s ?? "").split(/[,，]/).map(t => t.trim()).filter(Boolean)

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: "string" },
    desc: { type: "string" },
    category: { type: "string" },
    tags: { type: "string" },
    image: { type: "string" },
    publish: { type: "boolean", default: false },
  },
})

const { categories, tags: knownTags } = existingTaxonomy()
const interactive = positionals.length === 0

let slug, title, description, category, tags, image
if (interactive) {
  if (!process.stdin.isTTY) {
    console.error("Usage: pnpm new-post <slug> [--title ...] [--category ...] [--tags a,b] [--publish]")
    process.exit(1)
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  for (;;) {
    slug = toSlug(await rl.question("文件名 / URL（英文，例如 Xiaomi-Unlock-BL）: "))
    if (!validSlug(slug)) console.log("  只能用英文字母、数字和连字符，请重新输入。")
    else if (slugTaken(slug)) console.log(`  ${slug} 已经存在，请换一个。`)
    else break
  }
  title = (await rl.question("标题: ")).trim() || slug
  description = (await rl.question("描述（可留空）: ")).trim()
  if (categories.length) console.log(`  已有分类: ${categories.map((c, i) => `${i + 1}.${c}`).join("  ")}`)
  const catAnswer = (await rl.question("分类（输入序号或新分类名）: ")).trim()
  category = /^\d+$/.test(catAnswer) ? (categories[Number(catAnswer) - 1] ?? "") : catAnswer
  if (knownTags.length) console.log(`  常用标签: ${knownTags.slice(0, 20).join("  ")}`)
  tags = splitList(await rl.question("标签（逗号分隔，可留空）: "))
  image = (await rl.question("封面图 URL（可留空）: ")).trim()
  rl.close()
} else {
  slug = toSlug(positionals[0])
  if (!validSlug(slug)) {
    console.error(`Error: "${positionals[0]}" 不能作为文件名，只能用英文字母、数字和连字符`)
    process.exit(1)
  }
  if (slugTaken(slug)) {
    console.error(`Error: ${slug} 已经存在`)
    process.exit(1)
  }
  title = values.title ?? slug
  description = values.desc ?? ""
  category = values.category ?? ""
  tags = splitList(values.tags)
  image = values.image ?? ""
}

const newTags = tags.filter(t => !knownTags.includes(t))
const fullPath = path.join(POSTS_DIR, `${slug}.md`)
const content = `---
title: ${yamlStr(title)}
published: ${today()}
# updated: ${today()}        # 大幅修改后取消注释并改成当天，过期提示按这个日期计算
description: ${yamlStr(description)}
image: ${yamlStr(image)}
tags: [${tags.map(yamlStr).join(", ")}]
category: ${yamlStr(category)}
draft: ${!values.publish}
# outdatedNotice: false      # 不会过时的文章（随笔、测评）可以关掉过期提示
---

`

fs.writeFileSync(fullPath, content)

console.log(`\n已创建 ${fullPath}`)
if (category && !categories.includes(category)) console.log(`  注意: "${category}" 是新分类`)
if (newTags.length) console.log(`  注意: 新标签 ${newTags.join("、")}`)
if (!values.publish) console.log("  这是草稿（draft: true），写完后改成 false 才会发布")
