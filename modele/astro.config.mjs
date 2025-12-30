// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://example.com', // TODO: Replace with your domain
  trailingSlash: 'always',
  vite: {
    assetsInclude: ['**/*.woff2', '**/*.woff']
  },
  integrations: [mdx(), sitemap()],
  build: {
    inlineStylesheets: 'always'
  }
});
