import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.string().optional(),
      heroImageLink: z.string().url().optional(),
      heroImageAlt: z.string().optional(),
      draft: z.boolean().default(false),   // ← ICI
    }),
});

export const collections = { blog };
