#!/usr/bin/env tsx
/**
 * Validate image filenames follow kebab-case convention
 * Allowed: lowercase letters (a-z), digits (0-9), hyphens (-)
 * Pattern: word(-word)*.extension
 */

import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

// Regex: only lowercase, digits, hyphens, and valid extensions
const VALID_IMAGE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*\.(png|jpg|jpeg|webp|avif|gif|svg)$/;
const VALID_CONTENT_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*\.(md|mdx)$/;

// Directories to scan
const SCAN_DIRS = [
  { path: 'public/images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'], regex: VALID_IMAGE_REGEX },
  { path: 'src/content', extensions: ['md', 'mdx'], regex: VALID_CONTENT_REGEX }
];

interface ValidationError {
  path: string;
  filename: string;
  issue: string;
}

function getIssue(filename: string): string {
  if (/[A-Z]/.test(filename)) return 'contains uppercase letters';
  if (/[éèêëàâäùûüîïôöçñ]/.test(filename)) return 'contains accented characters';
  if (/[а-яА-Я]/.test(filename)) return 'contains cyrillic characters';
  if (/_/.test(filename)) return 'contains underscores (use hyphens instead)';
  if (/\s/.test(filename)) return 'contains spaces';
  if (/--/.test(filename)) return 'contains consecutive hyphens';
  if (/^-|-$/.test(filename.replace(/\.[^.]+$/, ''))) return 'starts or ends with hyphen';
  return 'does not match kebab-case pattern [a-z0-9-]';
}

function scanDirectory(dir: string, extensions: string[], regex: RegExp, errors: ValidationError[]): void {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Check directory name too
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry)) {
          errors.push({
            path: fullPath,
            filename: entry,
            issue: `directory name: ${getIssue(entry)}`
          });
        }
        scanDirectory(fullPath, extensions, regex, errors);
      } else if (stat.isFile()) {
        const ext = entry.split('.').pop()?.toLowerCase();
        if (extensions.includes(ext || '')) {
          if (!regex.test(entry)) {
            errors.push({
              path: fullPath,
              filename: entry,
              issue: getIssue(entry)
            });
          }
        }
      }
    }
  } catch (e) {
    // Directory doesn't exist, skip
  }
}

function main(): void {
  const errors: ValidationError[] = [];

  console.log('Validating filenames (images + content)...\n');

  for (const { path, extensions, regex } of SCAN_DIRS) {
    scanDirectory(path, extensions, regex, errors);
  }

  if (errors.length === 0) {
    console.log('✓ All filenames are valid (kebab-case)\n');
    process.exit(0);
  }

  console.error(`✗ Found ${errors.length} invalid filename(s):\n`);

  for (const error of errors) {
    console.error(`  ${error.path}`);
    console.error(`    → ${error.issue}\n`);
  }

  console.error('Expected format: lowercase-words-separated-by-hyphens.ext');
  console.error('Allowed: a-z, 0-9, - (hyphen)');
  console.error('Example: nebuleuse-orion-2024.jpg\n');

  process.exit(1);
}

main();
