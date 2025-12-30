---
title: "First Example Article"
description: "This is an example article to show you the blog structure."
pubDate: 2024-01-15
heroImage: "/images/placeholders/hero-placeholder.png"
heroImageAlt: "Example image"
tags: ["Example"]
---

# Welcome to your new blog

This is an example article to help you get started. You can modify or delete it.

## How to create a new article

1. Create a new `.md` or `.mdx` file in the `src/content/blog/` folder
2. Add the frontmatter with metadata (title, description, date, etc.)
3. Write your content in Markdown

## Available frontmatter

```yaml
---
title: "Article title"
description: "Description for SEO"
pubDate: 2024-01-15
updatedDate: 2024-01-16  # optional
heroImage: "/images/my-image.png"  # optional
heroImageAlt: "Image description"  # optional
heroImageLink: "https://example.com"  # optional
draft: false  # true to hide the article
tags: ["Tag1", "Tag2"]  # optional
relatedArticles: ["article-slug-1"]  # optional
---
```

## Customization

Don't forget to customize:
- `src/consts.ts` - Site name, description, social links
- `astro.config.mjs` - Your site URL
- `src/pages/index.astro` - Homepage

Happy blogging!
