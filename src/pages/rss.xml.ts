import { siteConfig } from '@/config'
import rss from '@astrojs/rss'
import { getSortedPosts } from '@utils/content-utils'
import type { APIContext } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { type CollectionEntry, render } from 'astro:content'
import sanitizeHtml from 'sanitize-html'

function stripInvalidXmlChars(str: string): string {
  return str.replace(
    // https://www.w3.org/TR/xml/#charsets
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F﷐-﷯￾￿]/g,
    '',
  )
}

// Render each post with the site's own Markdown pipeline, so admonitions,
// GitHub alerts, math and code blocks come out as HTML instead of raw syntax
const container = await AstroContainer.create()

async function renderContent(post: CollectionEntry<'posts'>): Promise<string> {
  const { Content } = await render(post)
  const html = (await container.renderToString(Content))
    // Drop page-only widgets: heading anchors ("#") and GitHub cards, which
    // fill themselves in with a script that feed readers never run
    .replace(/<a [^>]*class="(?:anchor|card-github)\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    // Code blocks: drop the line-number gutter and the frame caption
    .replace(/<div class="gutter">[\s\S]*?<\/div><\/div>/g, '')
    .replace(/<figcaption[\s\S]*?<\/figcaption>/g, '')
  return sanitizeHtml(stripInvalidXmlChars(html), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  })
}

export async function GET(context: APIContext) {
  const blog = (await getSortedPosts()) as unknown as CollectionEntry<'posts'>[]

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site: context.site as URL, // `site` is set in astro.config.mjs
    items: await Promise.all(
      blog.map(async post => ({
        title: post.data.title,
        pubDate: post.data.published,
        description: post.data.description || '',
        link: `/posts/${post.id}/`,
        categories: [post.data.category, ...post.data.tags].filter(
          (c): c is string => !!c,
        ),
        content: await renderContent(post),
      })),
    ),
    customData: `<language>${siteConfig.lang.replace('_', '-')}</language>`,
  })
}
