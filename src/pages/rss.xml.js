import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL } from "../consts";

const escapeXml = (value) =>
String(value)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&apos;");

const formatDate = (value) => {
const date = value instanceof Date ? value : new Date(value);
return date.toUTCString();
};

export async function GET() {
const posts = await getCollection("blog");
const items = posts
.sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate))
.map((post) => {
const link = `${SITE_URL}/blog/${post.id}/`;
const heroImage = post.data.heroImage
? `<media:content url="${escapeXml(`${SITE_URL}${post.data.heroImage}`)}" medium="image"/>`
: "";

return `
<item>
<title>${escapeXml(post.data.title)}</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="true">${escapeXml(link)}</guid>
<description>${escapeXml(post.data.description)}</description>
<pubDate>${escapeXml(formatDate(post.data.pubDate))}</pubDate>
${heroImage}
</item>`;
})
.join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${escapeXml(SITE_TITLE)}</title>
<link>${escapeXml(SITE_URL)}</link>
<description>${escapeXml(SITE_DESCRIPTION)}</description>
<language>en-us</language>
${items}
</channel>
</rss>`;

return new Response(xml, {
status: 200,
headers: {
"Content-Type": "application/xml; charset=utf-8",
},
});
}
