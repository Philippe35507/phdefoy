// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://phdefoy.com',
  trailingSlash: 'never',
  integrations: [mdx(), sitemap()],
  build: {
    inlineStylesheets: 'always' // inline tout le CSS => plus de <link rel="stylesheet"> bloquants
  }
});

