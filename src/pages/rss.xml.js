import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const cleanId = (id) => id.replace(/^.*\//, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');

export async function GET(context) {
	const posts = await getCollection('blog');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/${cleanId(post.id)}/`,
		})),
	});
}
