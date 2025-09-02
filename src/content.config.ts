import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({}) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.string().optional(),     // <-- passage de image() à string()
      heroImageLink: z.string().url().optional(),
      heroImageAlt: z.string().optional(),  // tu peux aussi ajouter ce champ si tu ne l'as pas encore
    }),
});

export const collections = { blog };
