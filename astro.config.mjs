// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import { defineConfig } from 'astro/config';
import validateFilenames from './src/integrations/validate-filenames';

export default defineConfig({
  site: 'https://phdefoy.com',
  trailingSlash: 'always',
  vite: {
    assetsInclude: ['**/*.woff2', '**/*.woff']
  },
  integrations: [mdx(), sitemap(), validateFilenames()],
  markdown: {
    rehypePlugins: [rehypeSlug]
  },
  build: {
    inlineStylesheets: 'always' // inline tout le CSS => plus de <link rel="stylesheet"> bloquants
  }
});

