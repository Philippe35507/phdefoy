/**
 * Script pour supprimer les balises <style> inline des fichiers MDX
 * Les styles sont externalisés dans src/styles/books.css
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'src/content';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Regex pour détecter les balises <style>...</style> (multiline)
const STYLE_REGEX = /\s*<style>[\s\S]*?<\/style>\s*/g;

// Trouver récursivement tous les fichiers .mdx
function findMdxFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function removeStyles(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Vérifier si le fichier contient des balises <style>
  if (!STYLE_REGEX.test(content)) {
    return false;
  }

  // Reset regex
  STYLE_REGEX.lastIndex = 0;

  // Supprimer les balises <style>
  const newContent = content.replace(STYLE_REGEX, '\n');

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${path.basename(filePath)} - styles à supprimer`);
  } else {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  ✓ ${path.basename(filePath)} - styles supprimés`);
  }

  return true;
}

async function main() {
  console.log('\n🧹 Suppression des styles inline\n');
  console.log(`Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🚀 EXÉCUTION RÉELLE'}\n`);

  const mdxFiles = findMdxFiles(CONTENT_DIR);
  console.log(`📁 Trouvé ${mdxFiles.length} fichiers .mdx\n`);

  let count = 0;
  for (const file of mdxFiles) {
    if (removeStyles(file)) {
      count++;
    }
  }

  console.log(`\n✅ ${count} fichiers modifiés`);

  if (DRY_RUN) {
    console.log('\n💡 Pour exécuter: npx tsx scripts/remove-inline-styles.ts');
  }
}

main().catch(console.error);
