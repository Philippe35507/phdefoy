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
npm run blog        # Generate daily fiction article + optimize images
npx tsx scripts/optimize-images.ts  # Optimize images only
npm run add:seo     # Add SEO slugs to content
```

## Architecture

### Content Generation Pipeline (`src/data/scripts/generate-daily-fiction.ts`)
- Uses Anthropic Claude API to generate literary analysis articles
- Uses OpenAI gpt-image-1 for hero and inline images
- Articles are generated from a list of novels in `src/data/scripts/fixed-novels.json`
- Outputs markdown files to `src/content/blog/ia/`
- Images are saved as PNG/WEBP/AVIF triplets in `public/images/ia/`

### Blog Content Schema (`src/content.config.ts`)
Blog posts require:
- `title`, `description`, `pubDate` (required)
- `heroImage`, `heroImageLink`, `heroImageAlt` (optional)
- `draft` (boolean, defaults to false)

### Image Handling
- New AI articles use `<picture>` element with AVIF/WEBP/PNG sources
- Hero images under `/images/ia/` with `.png` extension trigger the `<picture>` logic in `BlogPost.astro`
- Fallback placeholder: `/images/placeholders/hero-portrait.png`

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
