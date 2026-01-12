// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { h } from 'hastscript';
import { defineConfig } from 'astro/config';
import validateFilenames from './src/integrations/validate-filenames';

// Mode server uniquement en dev (pour /admin/ et API routes)
// En production (npm run build) → statique pour Netlify
const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://phdefoy.com',
  ...(isDev && {
    output: 'server',
    adapter: node({ mode: 'standalone' })
  }),
  trailingSlash: 'always',
  vite: {
    assetsInclude: ['**/*.woff2', '**/*.woff']
  },
  integrations: [mdx(), sitemap(), validateFilenames()],
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: ['anchor-link'], ariaHidden: 'true', tabIndex: -1 },
        content: h('span', ' 🔗')
      }]
    ]
  },
  build: {
    inlineStylesheets: 'always' // inline tout le CSS => plus de <link rel="stylesheet"> bloquants
  }
});

