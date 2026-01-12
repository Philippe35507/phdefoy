import type { APIRoute } from 'astro';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Correspondances catégorie → dossier assets
const ASSETS_PATHS: Record<string, string> = {
  'Russe': 'src/assets/russe',
  'Espagnol': 'src/assets/esp',
  'Livres': 'src/assets/divers'
};

// Extensions d'images supportées
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category') || 'Russe';

    const assetsPath = ASSETS_PATHS[category];
    if (!assetsPath) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fullPath = path.join(process.cwd(), assetsPath);

    // Vérifier si le dossier existe
    if (!existsSync(fullPath)) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lister les fichiers images
    const files = await readdir(fullPath);
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    }).sort();

    return new Response(JSON.stringify(images), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur list-images:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
