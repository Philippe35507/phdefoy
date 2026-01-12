import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Correspondances catégorie → dossiers
const CATEGORY_PATHS: Record<string, { content: string; assets: string }> = {
  'Russe': {
    content: 'src/content/blog/russe',
    assets: 'src/assets/russe'
  },
  'Espagnol': {
    content: 'src/content/blog/espagnol',
    assets: 'src/assets/esp'
  },
  'Livres': {
    content: 'src/content/blog/autres',
    assets: 'src/assets/divers'
  }
};

interface MdxPayload {
  title: string;
  displayTitle?: string;
  description: string;
  pubDate: string;
  slug: string;
  category: string;
  imageName?: string;
  content: string;
  videoId?: string;
  videoTitle?: string;
  videoDescription?: string;
  videoDate?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: MdxPayload = await request.json();

    const { title, displayTitle, description, pubDate, slug, category, imageName, content, videoId, videoTitle, videoDescription, videoDate } = data;

    // Validation basique
    if (!title || !slug || !category || !content) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants (title, slug, category, content)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer les chemins selon la catégorie
    const paths = CATEGORY_PATHS[category];
    if (!paths) {
      return new Response(JSON.stringify({ error: `Catégorie inconnue: ${category}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Formater la date de publication
    const formattedPubDate = new Date(pubDate).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });

    // Chemin relatif de l'image pour le frontmatter (depuis src/assets/)
    const heroImagePath = imageName ? `/images/${paths.assets.split('/').pop()}/${imageName}` : '';

    // Déterminer la profondeur pour les imports
    // src/content/blog/russe/ → 3 niveaux pour remonter à src/
    const importPath = '../../../components';

    // Construire le frontmatter
    const frontmatterLines = [
      `title: "${title}"`,
      displayTitle ? `displayTitle: "${displayTitle}"` : null,
      `description: "${description}"`,
      `pubDate: "${formattedPubDate}"`,
      heroImagePath ? `heroImage: "${heroImagePath}"` : null,
      `tags: ["${category}"]`
    ].filter(Boolean).join('\n');

    // Construire le contenu MDX
    let mdxContent = `---
${frontmatterLines}
---
import OptimizedImage from '${importPath}/OptimizedImage.astro';
import VideoEmbed from '${importPath}/VideoEmbed.astro';

`;

    // Ajouter le contenu principal
    mdxContent += content;

    // Ajouter la vidéo si présente
    if (videoId && videoTitle) {
      mdxContent += `

<VideoEmbed
  id="${videoId}"
  title="${videoTitle}"
  description="${videoDescription || ''}"
  uploadDate="${videoDate || pubDate}"
/>
`;
    }

    // Créer le dossier si nécessaire
    const contentDir = path.join(process.cwd(), paths.content);
    if (!existsSync(contentDir)) {
      await mkdir(contentDir, { recursive: true });
    }

    // Écrire le fichier MDX
    const filePath = path.join(contentDir, `${slug}.mdx`);
    await writeFile(filePath, mdxContent, 'utf-8');

    return new Response(JSON.stringify({
      success: true,
      path: filePath,
      message: `Fichier créé: ${paths.content}/${slug}.mdx`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur save-mdx:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
