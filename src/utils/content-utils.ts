import { getCollection } from 'astro:content'
import type { BlogPostData } from '@/types/config'
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'

export async function getSortedPosts(): Promise<
  { body: string, data: BlogPostData; id: string }[]
> {
  const allBlogPosts = (await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })) as unknown as { body: string, data: BlogPostData; id: string }[]

  const sorted = allBlogPosts.sort(
    (a: { data: BlogPostData }, b: { data: BlogPostData }) => {
      const dateA = new Date(a.data.published)
      const dateB = new Date(b.data.published)
      return dateA > dateB ? -1 : 1
    },
  )

  for (let i = 1; i < sorted.length; i++) {
    sorted[i].data.nextSlug = sorted[i - 1].id
    sorted[i].data.nextTitle = sorted[i - 1].data.title
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    sorted[i].data.prevSlug = sorted[i + 1].id
    sorted[i].data.prevTitle = sorted[i + 1].data.title
  }

  return sorted
}

export type RelatedPost = {
  id: string
  title: string
  published: Date
  image: string
}

// Title tokens: lowercase ASCII words (miui, macos) and CJK bigrams (小米, 降级)
function titleTokens(title: string): Set<string> {
  const tokens = new Set<string>()
  for (const w of title.toLowerCase().match(/[a-z][a-z0-9]+/g) ?? []) tokens.add(w)
  for (const run of title.match(/\p{Script=Han}+/gu) ?? [])
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2))
  return tokens
}

/**
 * Picks up to `count` posts related to `post`: each shared tag scores 2,
 * the same category scores 1, and each shared title token scores 0.5
 * (at most 1.5, so titles never outweigh tags). Ties go to the newer post;
 * posts that share nothing are never suggested.
 */
type RelatablePost = {
  id: string
  data: Pick<BlogPostData, 'title' | 'published' | 'tags'> & {
    category?: string | null
    image?: string
  }
}

export function getRelatedPosts(
  post: RelatablePost,
  allPosts: RelatablePost[],
  count: number,
): RelatedPost[] {
  const tags = new Set(post.data.tags)
  const words = titleTokens(post.data.title)
  return allPosts
    .filter(p => p.id !== post.id)
    .map(p => {
      let score = p.data.tags.filter(t => tags.has(t)).length * 2
      if (post.data.category && p.data.category === post.data.category) score += 1
      const shared = [...titleTokens(p.data.title)].filter(w => words.has(w)).length
      score += Math.min(shared * 0.5, 1.5)
      return { p, score }
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.p.data.published).getTime() -
          new Date(a.p.data.published).getTime(),
    )
    .slice(0, count)
    .map(({ p }) => ({
      id: p.id,
      title: p.data.title,
      published: p.data.published,
      image: p.data.image ?? '',
    }))
}

export type Tag = {
  name: string
  count: number
}

export async function getTagList(): Promise<Tag[]> {
  const allBlogPosts = await getCollection<'posts'>('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })

  const countMap: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { tags: string[] } }) => {
    post.data.tags.map((tag: string) => {
      if (!countMap[tag]) countMap[tag] = 0
      countMap[tag]++
    })
  })

  // sort tags
  const keys: string[] = Object.keys(countMap).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  return keys.map(key => ({ name: key, count: countMap[key] }))
}

export type Category = {
  name: string
  count: number
}

export async function getCategoryList(): Promise<Category[]> {
  const allBlogPosts = await getCollection<'posts'>('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })
  const count: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { category: string | number | null } }) => {
    if (!post.data.category) {
      const ucKey = i18n(I18nKey.uncategorized)
      count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1
      return
    }
    count[post.data.category] = count[post.data.category]
      ? count[post.data.category] + 1
      : 1
  })

  const lst = Object.keys(count).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  const ret: Category[] = []
  for (const c of lst) {
    ret.push({ name: c, count: count[c] })
  }
  return ret
}
