// src/data/scripts/publish-from-chat.ts
// Script pour publier un article généré via conversation Claude
// Utilise OpenAI pour les images uniquement

import "dotenv/config";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { formatInTimeZone } from "date-fns-tz";
import OpenAI from "openai";

// =============================
// Types
// =============================
type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

interface ArticleInput {
  title: string;
  description: string;
  hero_prompt: string;
  inline_prompt: string;
  markdown: string;
}

// =============================
// Config
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = process.env.BLOG_DIR || "src/content/blog/ia";
const IMAGES_DIR = process.env.IMAGES_DIR || "public/images/ia";
const TIMEZONE = process.env.TZ || "Europe/Madrid";
const IMAGE_MODEL = (process.env.IMAGE_MODEL || "gpt-image-1").trim();
let IMAGE_QUALITY = (process.env.IMAGE_QUALITY || "medium").trim();
if (IMAGE_QUALITY.toLowerCase() === "low") IMAGE_QUALITY = "medium";

// Fichier d'entrée par défaut
const INPUT_FILE = process.env.ARTICLE_INPUT || "src/data/scripts/article-input.json";

// =============================
// Helpers
// =============================
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyLite(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayISO(date = new Date()) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

function getPortraitSize(model: string): "1024x1536" | "1024x1792" {
  if (model.includes("gpt-image-1")) return "1024x1536";
  return "1024x1792";
}

function shortHash(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").slice(0, 6);
}

function clampSlug(s: string, maxLen = 60) {
  return s.length <= maxLen ? s : s.slice(0, maxLen).replace(/-+$/, "");
}

function makeBaseNames(dateStr: string, slug: string) {
  const core = `${dateStr}-${clampSlug(slug, 60)}-${shortHash(slug)}`;
  return {
    heroBase: `${core}-hero`,
    inlineBase: `${core}-inline`,
  };
}

function injectInlineImage(markdown: string, inlinePngRel: string, alt: string) {
  const base = inlinePngRel.replace(/\.(png|jpe?g)$/i, "");
  const ext = inlinePngRel.match(/\.(png|jpe?g)$/i)?.[0] ?? ".png";
  const pic =
    `\n\n<picture>` +
    `<source srcset="${base}.avif" type="image/avif" />` +
    `<source srcset="${base}.webp" type="image/webp" />` +
    `<img src="${base}${ext}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />` +
    `</picture>\n\n`;
  const idx = markdown.indexOf("\n## ");
  return idx !== -1 ? markdown.slice(0, idx) + pic + markdown.slice(idx) : markdown + pic;
}

function stripLeadingH1(markdown: string) {
  return markdown.replace(/^#\s+.*\r?\n(?:\r?\n)*/m, "");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// =============================
// OpenAI Client
// =============================
const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "").trim(),
});

// =============================
// Images
// =============================
async function writeImageSet(
  outDir: string,
  baseName: string,
  srcBuffer: Buffer,
  maxWidth = 1600
) {
  ensureDir(outDir);
  const pngPath = path.join(outDir, `${baseName}.png`);
  const webpPath = path.join(outDir, `${baseName}.webp`);
  const avifPath = path.join(outDir, `${baseName}.avif`);

  const img = sharp(srcBuffer, { failOn: "none" }).withMetadata();
  const meta = await img.metadata();
  const resized = (meta.width ?? 0) > maxWidth ? img.resize({ width: maxWidth }) : img;

  await resized.png({ compressionLevel: 9, palette: true }).toFile(pngPath);
  await resized.webp({ quality: 82, effort: 5 }).toFile(webpPath);
  await resized.avif({ quality: 60, effort: 4 }).toFile(avifPath);

  return { pngPath, webpPath, avifPath };
}

async function generateImageBuffer(prompt: string, size: OpenAIImageSize): Promise<Buffer> {
  console.log(`🎨 Génération image: ${prompt.slice(0, 80)}... [${size}]`);
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size,
    quality: IMAGE_QUALITY as "medium" | "hd",
    n: 1,
  });

  const imageData: any = response.data?.[0];
  if (!imageData) throw new Error("Aucune donnée d'image retournée");

  const b64: string | undefined = imageData.b64_json || imageData.b64;
  const url: string | undefined = imageData.url;

  if (b64) return Buffer.from(b64, "base64");

  if (url) {
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) throw new Error(`Erreur téléchargement: ${fetchResponse.status}`);
    const arrayBuffer = await fetchResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Ni b64 ni url disponible");
}

async function safeGenerateImageBuffer(prompt: string, size: OpenAIImageSize) {
  try {
    return await generateImageBuffer(prompt, size);
  } catch (e: any) {
    console.warn("⚠️ Image OpenAI indisponible:", e?.message);
    return null;
  }
}

// =============================
// Main
// =============================
async function main() {
  const inputPath = path.resolve(INPUT_FILE);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Fichier d'entrée introuvable: ${inputPath}`);
    console.log(`
📝 Pour utiliser ce script:
1. Demandez à Claude de générer un article sur un livre
2. Claude sauvegardera le contenu dans: ${inputPath}
3. Relancez ce script: npx tsx src/data/scripts/publish-from-chat.ts
    `);
    process.exit(1);
  }

  console.log(`📖 Lecture de: ${inputPath}`);
  const raw = fs.readFileSync(inputPath, "utf8");
  let article: ArticleInput;

  try {
    article = JSON.parse(raw);
  } catch (e) {
    console.error("❌ JSON invalide dans le fichier d'entrée");
    process.exit(1);
  }

  // Validation
  if (!article.title || !article.markdown) {
    console.error("❌ Le fichier doit contenir au moins 'title' et 'markdown'");
    process.exit(1);
  }

  const dateStr = todayISO();
  const dryRun = process.env.DRY_RUN === "true";

  console.log("🚀 Publication article depuis conversation Claude");
  console.log(`📝 Titre: "${article.title}"`);
  console.log(`🖼 Modèle image: ${IMAGE_MODEL}/${IMAGE_QUALITY}`);

  const slug = slugify(article.title);
  const { heroBase, inlineBase } = makeBaseNames(dateStr, slug);

  const heroDirAbs = path.join(IMAGES_DIR, heroBase);
  const inlineDirAbs = path.join(IMAGES_DIR, inlineBase);
  const heroRelPng = `/${path.posix.join("images", "ia", heroBase, `${heroBase}.png`)}`;
  const inlineRelPng = `/${path.posix.join("images", "ia", inlineBase, `${inlineBase}.png`)}`;

  let heroBuf: Buffer | null = null;
  let inlineBuf: Buffer | null = null;

  if (!dryRun) {
    console.log("🎨 Génération images...");

    if (article.hero_prompt) {
      heroBuf = await safeGenerateImageBuffer(article.hero_prompt, getPortraitSize(IMAGE_MODEL));
    }
    if (article.inline_prompt) {
      inlineBuf = await safeGenerateImageBuffer(article.inline_prompt, "1024x1024");
    }

    if (heroBuf) {
      ensureDir(heroDirAbs);
      await writeImageSet(heroDirAbs, heroBase, heroBuf);
    }
    if (inlineBuf) {
      ensureDir(inlineDirAbs);
      await writeImageSet(inlineDirAbs, inlineBase, inlineBuf);
    }
  } else {
    console.log("⚠️ Mode DRY-RUN: pas de génération d'images");
  }

  // Chemins finaux (avec fallback)
  const heroRel = heroBuf ? heroRelPng : `/images/placeholders/hero-portrait.png`;
  const inlineRel = inlineBuf ? inlineRelPng : `/images/placeholders/inline-1024.png`;

  // Construction du markdown final
  const cleanedMd = stripLeadingH1(article.markdown);
  const mdWithImg = injectInlineImage(cleanedMd, inlineRel, `Illustration: ${article.title}`);

  const frontmatter =
    `---\n` +
    `title: "${article.title.replace(/"/g, '\\"')}"\n` +
    `description: "${(article.description || `Article sur ${article.title}`).replace(/"/g, '\\"')}"\n` +
    `pubDate: "${dateStr}"\n` +
    `heroImage: "${heroRel}"\n` +
    `heroImageAlt: "Illustration: ${article.title.replace(/"/g, '\\"')}"\n` +
    `---\n\n`;

  ensureDir(BLOG_DIR);

  const fileSlug = slugifyLite(article.title);
  const fileName = `${fileSlug}.md`;
  const outPath = path.join(BLOG_DIR, fileName);

  fs.writeFileSync(outPath, frontmatter + mdWithImg, "utf8");

  // Nettoyage du fichier d'entrée après publication réussie
  if (!dryRun) {
    fs.unlinkSync(inputPath);
    console.log(`🗑️ Fichier d'entrée supprimé: ${inputPath}`);
  }

  console.log(`✅ Article publié: ${outPath}`);
  console.log(`🖼 Hero: ${heroRel} (${heroBuf ? "OK" : "PLACEHOLDER"})`);
  console.log(`🖼 Inline: ${inlineRel} (${inlineBuf ? "OK" : "PLACEHOLDER"})`);
}

main().catch((e) => {
  console.error("💥 Échec:", e);
  process.exit(1);
});

export {};
