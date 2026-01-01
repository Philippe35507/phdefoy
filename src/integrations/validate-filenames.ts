import type { AstroIntegration } from 'astro';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const VALID_IMAGE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*\.(png|jpg|jpeg|webp|avif|gif|svg)$/;
const VALID_CONTENT_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*\.(md|mdx)$/;

const SCAN_CONFIGS = [
  { path: 'public/images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'], regex: VALID_IMAGE_REGEX, label: 'image' },
  { path: 'src/content', extensions: ['md', 'mdx'], regex: VALID_CONTENT_REGEX, label: 'content' }
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
  } catch {
    // Directory doesn't exist, skip
  }
}

function validateSingleFile(filePath: string): void {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop() || '';
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  for (const config of SCAN_CONFIGS) {
    // Check if path contains the config path (handles absolute paths from watcher)
    if (normalizedPath.includes(config.path) && config.extensions.includes(ext)) {
      if (!config.regex.test(filename)) {
        console.log(`\n\x1b[33m⚠️  Invalid filename:\x1b[0m`);
        console.log(`  \x1b[31m${filePath}\x1b[0m`);
        console.log(`    → ${getIssue(filename)}\n`);
      }
      break;
    }
  }
}

function runFullValidation(): void {
  const errors: ValidationError[] = [];

  for (const config of SCAN_CONFIGS) {
    scanDirectory(config.path, config.extensions, config.regex, errors);
  }

  if (errors.length > 0) {
    console.log('\n\x1b[33m⚠️  Invalid filenames detected:\x1b[0m\n');
    for (const error of errors) {
      console.log(`  \x1b[31m${error.path}\x1b[0m`);
      console.log(`    → ${error.issue}\n`);
    }
    console.log('\x1b[90mExpected: lowercase-words-separated-by-hyphens.ext\x1b[0m\n');
  }
}

export default function validateFilenames(): AstroIntegration {
  return {
    name: 'validate-filenames',
    hooks: {
      'astro:server:start': () => {
        runFullValidation();
      },
      'astro:server:setup': ({ server }) => {
        server.watcher.on('add', (filePath: string) => {
          validateSingleFile(filePath);
        });
      }
    }
  };
}
