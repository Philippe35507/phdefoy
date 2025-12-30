# Astro Blog Template

Un template de blog moderne construit avec Astro, prêt à personnaliser.

## Fonctionnalités

- Blog avec support Markdown/MDX
- Design responsive moderne
- SEO optimisé (meta tags, Schema.org, sitemap)
- Liens sociaux configurables
- Fil d'Ariane (breadcrumb)
- Articles connexes
- Bouton retour en haut
- Support des images hero

## Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## Configuration

### 1. Informations du site

Modifiez `src/consts.ts` :

```typescript
export const SITE_NAME = 'Votre Nom';
export const SITE_TITLE = 'Titre de votre site';
export const SITE_DESCRIPTION = 'Description de votre site';
export const SITE_URL = 'https://votredomaine.com';

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/votrecompte',
  facebook: '',
  instagram: '',
  youtube: '',
};

export const TWITTER_HANDLE = '@votrecompte';
```

### 2. URL du site

Modifiez `astro.config.mjs` :

```javascript
export default defineConfig({
  site: 'https://votredomaine.com',
  // ...
});
```

### 3. Personnaliser la page d'accueil

Éditez `src/pages/index.astro` selon vos besoins.

## Structure du projet

```
modele/
├── public/
│   ├── favicon.svg
│   └── images/
│       └── placeholders/
├── src/
│   ├── components/
│   │   ├── BackToTop.astro
│   │   ├── BaseHead.astro
│   │   ├── Breadcrumb.astro
│   │   ├── Footer.astro
│   │   ├── FormattedDate.astro
│   │   ├── Header.astro
│   │   └── HeaderLink.astro
│   ├── content/
│   │   └── blog/
│   │       └── exemple-article.md
│   ├── layouts/
│   │   └── BlogPost.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── [slug].astro
│   │   └── blog/
│   │       └── index.astro
│   ├── styles/
│   │   ├── global.css
│   │   └── blog-post.css
│   ├── consts.ts
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Créer un article

Créez un fichier `.md` ou `.mdx` dans `src/content/blog/` :

```markdown
---
title: "Titre de l'article"
description: "Description pour le SEO"
pubDate: 2024-01-15
heroImage: "/images/mon-image.png"
heroImageAlt: "Description de l'image"
tags: ["Tag1", "Tag2"]
---

Contenu de l'article en Markdown...
```

### Frontmatter disponible

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `title` | string | Oui | Titre de l'article |
| `description` | string | Oui | Description pour le SEO |
| `pubDate` | date | Oui | Date de publication |
| `updatedDate` | date | Non | Date de mise à jour |
| `heroImage` | string | Non | Chemin vers l'image hero |
| `heroImageAlt` | string | Non | Texte alternatif de l'image |
| `heroImageLink` | string | Non | Lien externe sur l'image |
| `draft` | boolean | Non | `true` pour cacher l'article |
| `tags` | string[] | Non | Tags/catégories |
| `relatedArticles` | string[] | Non | Slugs d'articles connexes |

## Déploiement

Compatible avec :
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages
- Et tout hébergeur supportant les sites statiques

## Licence

MIT
