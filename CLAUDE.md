# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog site (phdefoy.com) built with Astro, featuring literary analysis articles about fiction. The site is in French and uses AI-generated content and images.

## Commands

```bash
# Development
npm run dev         # Start Astro dev server

# Build
npm run build       # Production build

# Generate content
npm run blog        # Generate daily fiction article (API Claude + OpenAI)
npx tsx scripts/optimize-images.ts  # Optimize images only
npm run add:seo     # Add SEO slugs to content
```

## Architecture

### Content Generation Pipeline (`src/data/scripts/generate-daily-fiction.ts`)
- Uses Anthropic Claude API to generate literary analysis articles
- Uses OpenAI gpt-image-1 for hero and inline images
- Articles are generated from a list of novels in `src/data/scripts/fixed-novels.json`
- Outputs MDX files to `src/content/blog/ia/`
- Images are saved as PNG/WEBP/AVIF triplets in `public/images/ia/`

### Blog Structure
All blog content uses MDX format (.mdx) organized in lowercase folders:
- `src/content/blog/ia/` - AI-generated literary articles
- `src/content/blog/espagnol/` - Spanish language learning
- `src/content/blog/russe/` - Russian language learning
- `src/content/blog/autres/` - Other articles

### Pillar Pages
Pillar pages use MDX content in `src/content/pillars/`:
- `espagnol.mdx` → rendered by `src/pages/apprendre-espagnol/index.astro`
- `russe.mdx` → rendered by `src/pages/apprendre-le-russe/index.astro`
- `livres.mdx` → rendered by `src/pages/livres/index.astro`

### Blog Content Schema (`src/content.config.ts`)
Blog posts require:
- `title`, `description`, `pubDate` (required)
- `heroImage`, `heroImageLink`, `heroImageAlt` (optional)
- `draft` (boolean, defaults to false)

### Image Handling

**Structure des images :**
```
src/assets/           # Images optimisées automatiquement par Astro (→ AVIF)
├── esp/              # Images articles espagnol
├── russe/            # Images articles russe
└── divers/           # Autres images (livres, auteurs, poe, polybe, etc.)

public/images/        # Images statiques (ne pas ajouter ici sauf pour ia/)
└── ia/               # Images IA avec triplets manuels AVIF/WEBP/PNG
```

**Logique d'affichage (`BlogPost.astro`) :**
1. Images `/images/ia/*.png` → `<picture>` avec triplets AVIF/WEBP/PNG
2. Images `/images/esp/`, `/images/russe/`, autres → recherche auto dans `src/assets/` → `<Image>` Astro

**Note :** Les fichiers MDX peuvent référencer `/images/esp/...` ou `/images/russe/...` - le code `BlogPost.astro` redirige automatiquement vers `src/assets/` pour l'optimisation AVIF.

### Key Files
- `src/layouts/BlogPost.astro` - Blog post layout with image handling logic
- `src/consts.ts` - Site-wide constants (SITE_TITLE, SITE_DESCRIPTION)
- `astro.config.mjs` - Astro config with MDX and sitemap integrations

### Environment Variables
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` - For article generation
- `OPENAI_API_KEY` - For image generation
- `CLAUDE_MODEL` - Model to use (default: claude-sonnet-4-20250514)
- `IMAGE_MODEL` - Image model (default: gpt-image-1)
- `DRY_RUN=true` - Test mode without API calls
