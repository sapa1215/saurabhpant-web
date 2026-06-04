import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
	const posts = await getCollection("blog");
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: "https://saurabhpant.com",
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/blog/${post.id}/`,
			customData: post.data.heroImage
				? `<enclosure url="https://saurabhpant.com${post.data.heroImage}" type="image/jpeg" length="0"/>
				   <media:content url="https://saurabhpant.com${post.data.heroImage}" medium="image"/>`
				: "",
		})),
		customData: `
			<language>en-us</language>
			<managingEditor>saurabh@saurabhpant.com</managingEditor>
			<webMaster>saurabh@saurabhpant.com</webMaster>
			<xmlns:media>http://search.yahoo.com/mrss/</xmlns:media>
		`,
	});
}
