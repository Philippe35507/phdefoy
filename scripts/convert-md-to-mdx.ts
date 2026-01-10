/**
 * Script de conversion MD → MDX
 *
 * Convertit tous les fichiers .md en .mdx et remplace les images markdown
 * par le composant OptimizedImage.
 *
 * Usage:
 *   npx tsx scripts/convert-md-to-mdx.ts          # Exécution réelle
 *   DRY_RUN=true npx tsx scripts/convert-md-to-mdx.ts  # Mode test (aucune modification)
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'src/content';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Regex pour détecter les images markdown : ![alt](/images/...)
const IMAGE_REGEX = /!\[(.*?)\]\((\/images\/[^\)]+)\)/g;

// Trouver récursivement tous les fichiers .md
function findMdFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Calculer le chemin relatif vers le dossier components depuis un fichier
function getImportPath(mdxFilePath: string): string {
  const dir = path.dirname(mdxFilePath);
  const relative = path.relative(dir, 'src/components');
  // Normaliser pour les imports ES (forward slashes)
  return relative.replace(/\\/g, '/');
}

function convertFile(mdPath: string): { converted: boolean; imageCount: number } {
  const content = fs.readFileSync(mdPath, 'utf-8');

  // Séparer frontmatter et body
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    console.warn(`  ⚠ Pas de frontmatter dans ${mdPath}, fichier ignoré`);
    return { converted: false, imageCount: 0 };
  }

  const frontmatter = frontmatterMatch[0];
  let body = content.slice(frontmatter.length);

  // Compter et remplacer les images markdown
  let imageCount = 0;
  const hasMarkdownImages = IMAGE_REGEX.test(body);

  if (hasMarkdownImages) {
    // Reset regex lastIndex
    IMAGE_REGEX.lastIndex = 0;

    body = body.replace(IMAGE_REGEX, (_match, alt, src) => {
      imageCount++;
      const cleanAlt = alt || 'Image';
      return `<OptimizedImage src="${src}" alt="${cleanAlt}" />`;
    });
  }

  // Construire le nouveau contenu MDX
  let newContent = frontmatter;
  if (imageCount > 0) {
    const importPath = getImportPath(mdPath);
    newContent += `\nimport OptimizedImage from '${importPath}/OptimizedImage.astro';\n`;
  }
  newContent += body;

  // Nouveau chemin .mdx
  const mdxPath = mdPath.replace(/\.md$/, '.mdx');

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${path.basename(mdPath)} → ${path.basename(mdxPath)}`);
    if (imageCount > 0) {
      console.log(`    → ${imageCount} image(s) à convertir`);
    }
  } else {
    // Écrire le nouveau fichier
    fs.writeFileSync(mdxPath, newContent, 'utf-8');
    // Supprimer l'ancien fichier .md
    fs.unlinkSync(mdPath);
    console.log(`  ✓ ${path.basename(mdPath)} → ${path.basename(mdxPath)}${imageCount > 0 ? ` (${imageCount} images)` : ''}`);
  }

  return { converted: true, imageCount };
}

async function main() {
  console.log('\n🔄 Conversion MD → MDX\n');
  console.log(`Mode: ${DRY_RUN ? '🧪 DRY RUN (aucune modification)' : '🚀 EXÉCUTION RÉELLE'}\n`);

  const mdFiles = findMdFiles(CONTENT_DIR);
  console.log(`📁 Trouvé ${mdFiles.length} fichiers .md dans ${CONTENT_DIR}/\n`);

  let totalConverted = 0;
  let totalImages = 0;

  // Grouper par dossier pour un affichage plus clair
  const byFolder = new Map<string, string[]>();
  for (const file of mdFiles) {
    const folder = path.dirname(file);
    if (!byFolder.has(folder)) {
      byFolder.set(folder, []);
    }
    byFolder.get(folder)!.push(file);
  }

  for (const [folder, files] of byFolder) {
    console.log(`📂 ${folder.replace(/\\/g, '/')} (${files.length} fichiers)`);

    for (const file of files) {
      const result = convertFile(file);
      if (result.converted) {
        totalConverted++;
        totalImages += result.imageCount;
      }
    }
    console.log('');
  }

  console.log('─'.repeat(50));
  console.log(`\n✅ Résumé:`);
  console.log(`   • ${totalConverted} fichiers convertis`);
  console.log(`   • ${totalImages} images transformées en <OptimizedImage />`);

  if (DRY_RUN) {
    console.log('\n💡 Pour exécuter réellement: npx tsx scripts/convert-md-to-mdx.ts');
  } else {
    console.log('\n🎉 Conversion terminée !');
    console.log('   Lancez `npm run build` pour vérifier que tout fonctionne.');
  }
}

main().catch(console.error);
