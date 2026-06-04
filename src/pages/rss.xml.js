import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
	const posts = await getCollection("blog");
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: "https://saurabhpant.com",
		xmlns: {
			media: "http://search.yahoo.com/mrss/",
		},
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.id}/`,
			customData: post.data.heroImage
				? `<media:content url="https://saurabhpant.com${post.data.heroImage}" medium="image"/>`
				: "",
		})),
		customData: `<language>en-us</language>`,
	});
}
