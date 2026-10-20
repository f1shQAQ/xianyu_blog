import rss from "@astrojs/rss";
import { getFeedPosts } from "@utils/feed";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";

export async function GET(context: APIContext): Promise<Response> {
	const site = context.site ?? new URL(siteConfig.site);
	const posts = await getFeedPosts(site);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: site.href,
		items: posts.map((post) => ({
			title: post.title,
			pubDate: post.pubDate,
			description: post.description,
			link: post.link,
			categories: [post.category, ...post.tags].filter((c): c is string => !!c),
			content: post.contentHtml,
		})),
		customData: `<language>${siteConfig.lang.replace("_", "-")}</language>`,
	});
}
