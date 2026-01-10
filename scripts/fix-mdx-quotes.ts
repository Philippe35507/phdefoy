/**
 * Script pour corriger les guillemets dans les attributs alt des composants MDX
 * Remplace les guillemets internes par des apostrophes
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'src/content';

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

function fixQuotes(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Pattern pour trouver les attributs alt avec des guillemets internes
  // Capture: alt="...contenu avec "guillemets"..."
  const altPattern = /alt="([^"]*)"([^"]+)"([^"]*)"/g;

  // Remplacer les guillemets internes par des tirets ou apostrophes
  let newContent = content;
  let match;

  // Reset regex
  altPattern.lastIndex = 0;

  while ((match = altPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    // Reconstruire sans les guillemets internes
    const before = match[1];
    const quoted = match[2];
    const after = match[3];
    const fixed = `alt="${before}${quoted}${after}"`;
    newContent = newContent.replace(fullMatch, fixed);
    modified = true;
  }

  // Deuxième passe: gérer les cas plus complexes avec regex simplifiée
  // Chercher alt="....."..." et corriger
  const simplePattern = /<OptimizedImage[^>]*alt="([^"]*)"([^"/"]+)"([^"]*)"[^>]*\/>/g;

  newContent = newContent.replace(simplePattern, (match, p1, p2, p3) => {
    modified = true;
    return match.replace(`"${p2}"`, p2);
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  ✓ ${path.basename(filePath)}`);
  }

  return modified;
}

// Approche alternative: utiliser sed-like replacement
function fixQuotesSimple(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Remplacer "Illustration: "X" par "Illustration: X
  content = content.replace(/alt="Illustration: "([^"]+)"/g, 'alt="Illustration: $1');

  // Puis fermer correctement le guillemet à la fin
  // Chercher les lignes avec OptimizedImage mal formées
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    if (line.includes('<OptimizedImage') && line.includes('alt="')) {
      // Compter les guillemets - il devrait y en avoir un nombre pair
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Nombre impair = problème, essayer de fixer
        // Pattern typique: alt="Illustration: "Titre" - Description"
        line = line.replace(/alt="Illustration: "([^"]+)" ([^"]+)"/g, 'alt="Illustration: $1 - $2"');
        line = line.replace(/alt="Illustration: "([^"]+)"([^"]+)"/g, 'alt="Illustration: $1$2"');
      }
    }
    return line;
  });

  content = fixedLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ ${path.basename(filePath)}`);
    return true;
  }

  return false;
}

async function main() {
  console.log('\n🔧 Correction des guillemets dans les attributs alt\n');

  const mdxFiles = findMdxFiles(CONTENT_DIR);
  console.log(`📁 Trouvé ${mdxFiles.length} fichiers .mdx\n`);

  let count = 0;
  for (const file of mdxFiles) {
    if (fixQuotesSimple(file)) {
      count++;
    }
  }

  console.log(`\n✅ ${count} fichiers corrigés`);
}

main().catch(console.error);
