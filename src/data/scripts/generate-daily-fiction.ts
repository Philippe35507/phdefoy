// src/data/scripts/generate-daily-fiction.ts
// Node >= 18, TS/ESM

import "dotenv/config";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { formatInTimeZone } from "date-fns-tz";
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages.mjs";
import OpenAI from "openai";
import novelsData from "./fixed-novels.json"; // [{ "title": "...", "author": "..." }]

// =============================
// Types
// =============================
interface Novel {
  title: string;
  author: string;
}
type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

type ClaudeResponse = {
  title: string;
  description: string;
  hero_prompt: string;
  inline_prompt: string;
  markdown: string;
};

// =============================
// Contexte / Config
// =============================
const NOVELS: Novel[] = novelsData as Novel[];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = process.env.BLOG_DIR || "src/content/blog/ia";
const IMAGES_DIR = process.env.IMAGES_DIR || "public/images/ia";
const TIMEZONE = process.env.TZ || "Europe/Madrid";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL || "claude-3-7-sonnet-20250219").trim();
const IMAGE_MODEL = (process.env.IMAGE_MODEL || "gpt-image-1").trim();
let IMAGE_QUALITY = (process.env.IMAGE_QUALITY || "medium").trim();
if (IMAGE_QUALITY.toLowerCase() === "low") IMAGE_QUALITY = "medium";

// =============================
// Helpers généraux
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
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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
// Chemins courts Windows (évite MAX_PATH)
function shortHash(s: string) {
  return crypto.createHash("md5").update(s).digest("hex").slice(0, 6);
}
function clampSlug(s: string, maxLen = 60) {
  return s.length <= maxLen ? s : s.slice(0, maxLen).replace(/-+$/,"");
}
function makeBaseNames(dateStr: string, slug: string) {
  const core = `${dateStr}-${clampSlug(slug, 60)}-${shortHash(slug)}`; // court + unique
  return {
    heroBase:   `${core}-hero`,
    inlineBase: `${core}-inline`,
  };
}
// Injection d’un <picture> (avif/webp/png) pour l'inline dans le Markdown
function injectInlineImage(markdown: string, inlinePngRel: string, alt: string) {
  const base = inlinePngRel.replace(/\.(png|jpe?g)$/i, "");
  const ext = (inlinePngRel.match(/\.(png|jpe?g)$/i)?.[0] ?? ".png");
  const pic =
    `\n\n<picture>` +
    `<source srcset="${base}.avif" type="image/avif" />` +
    `<source srcset="${base}.webp" type="image/webp" />` +
    `<img src="${base}${ext}" alt="${alt}" loading="lazy" decoding="async" />` +
    `</picture>\n\n`;
  const idx = markdown.indexOf("\n## ");
  return idx !== -1 ? markdown.slice(0, idx) + pic + markdown.slice(idx) : markdown + pic;
}
function stripLeadingH1(markdown: string) {
  return markdown.replace(/^#\s+.*\r?\n(?:\r?\n)*/m, "");
}

// === Index du roman du jour (avance automatiquement, boucle sur la liste) ===
// Tu peux changer l’ancrage si besoin (ex: NOVEL_ANCHOR_DATE=2025-09-01)
const NOVEL_ANCHOR_DATE = process.env.NOVEL_ANCHOR_DATE || "2025-09-06";
function getNovelIndexForToday(): number {
  // Override manuel possible: NOVEL_INDEX=2
  const ov = process.env.NOVEL_INDEX;
  if (ov && /^\d+$/.test(ov)) {
    return Math.min(NOVELS.length - 1, Math.max(0, parseInt(ov, 10)));
  }
  const tz = TIMEZONE;
  const todayMid = new Date(formatInTimeZone(new Date(), tz, "yyyy-MM-dd'T'00:00:00XXX"));
  const anchorMid = new Date(
    formatInTimeZone(new Date(`${NOVEL_ANCHOR_DATE}T00:00:00`), tz, "yyyy-MM-dd'T'00:00:00XXX")
  );
  const days = Math.floor((todayMid.getTime() - anchorMid.getTime()) / 86_400_000);
  const idx = ((days % NOVELS.length) + NOVELS.length) % NOVELS.length; // modulo positif
  return idx;
}

// =============================
// Clients API
// =============================
const anthropic = new Anthropic({
  apiKey: (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim()
});
const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "").trim()
});

// =============================
// Images: buffers & écriture triplet
// =============================

// Écrit un triplet PNG+WEBP+AVIF optimisés dans un sous-dossier <outDir>/<baseName>.*
async function writeImageSet(
  outDir: string,
  baseName: string,
  srcBuffer: Buffer,
  maxWidth = 1600
) {
  ensureDir(outDir);
  const pngPath  = path.join(outDir, `${baseName}.png`);
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

// Génère un Buffer d'image (OpenAI)
async function generateImageBuffer(prompt: string, size: OpenAIImageSize): Promise<Buffer> {
  console.log(`🎨 Génération image: ${prompt.slice(0, 80)}... [${size}]`);
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size,
    quality: IMAGE_QUALITY as "medium" | "hd",
    n: 1
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
// Prompt Claude (resserré sur l'œuvre)
// =============================
function buildUserPrompt(novel: Novel): string {
  return `Tu dois écrire UNIQUEMENT sur "${novel.title}" de ${novel.author}. N'inclus aucune autre œuvre.

Exigences :
- 800–1000 mots
- Commencer par un titre H1 informatif
- Introduction claire présentant l’œuvre et son intérêt
- Analyse structurée (intrigue, enjeux, style, réception)
- Mise en perspective : pourquoi (re)lire ce livre aujourd’hui ?
- Conclusion synthétique et mémorable
- Ton accessible, informé, sans jargon

À la fin de ta réponse, ajoute sur une ligne séparée uniquement :
{"title":"[titre exact, doit contenir ${novel.title}]","description":"[description SEO 150 caractères]","hero_prompt":"[description artistique pour image de couverture]","inline_prompt":"[description pour illustration du livre]"}`;
}

// =============================
// Appel Claude (avec retries)
// =============================
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
async function callAnthropicWithRetry(
  args: Parameters<typeof anthropic.messages.create>[0],
  retries = 3
): Promise<Message> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return (await anthropic.messages.create({ ...args, stream: false })) as Message;
    } catch (e: any) {
      const shouldRetry = [408, 429, 500, 502, 503, 504, 529].includes(e?.status);
      if (!shouldRetry || attempt >= retries) throw e;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(`⏳ Retry Claude dans ${delay}ms (tentative ${attempt + 1})`);
      await sleep(delay);
      attempt++;
    }
  }
  throw new Error("Max retries exceeded");
}

async function callClaudeForStory(novel: Novel): Promise<ClaudeResponse> {
  const system = `Tu es un critique littéraire passionné qui écrit des articles de blog engageants.`;
  const user = buildUserPrompt(novel);

  const msg = await callAnthropicWithRetry({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: user }]
  });

  const full = msg.content?.map((c) => ("text" in c ? c.text : "")).join("\n") ?? "";
  let meta: any, article: string;

  try {
    const lines = full.split("\n");
    const jsonLine = lines[lines.length - 1];
    if (jsonLine.trim().startsWith("{") && jsonLine.trim().endsWith("}")) {
      meta = JSON.parse(jsonLine.trim());
      article = lines.slice(0, -1).join("\n").trim();
    } else throw new Error("JSON non trouvé");
  } catch {
    const h1Match = full.match(/^#\s+(.+)$/m);
    const fallbackTitle = h1Match ? h1Match[1].trim() : `${novel.title} — Analyse`;
    meta = {
      title: fallbackTitle,
      description: `Analyse de ${novel.title} de ${novel.author}.`,
      hero_prompt: `Illustration littéraire du livre ${novel.title}`,
      inline_prompt: `Visuel symbolique inspiré de ${novel.title}`
    };
    article = full;
  }

  return {
    title: meta.title,
    description: meta.description?.slice(0, 160) || `Article sur ${novel.title}`,
    hero_prompt: meta.hero_prompt,
    inline_prompt: meta.inline_prompt,
    markdown: article
  };
}

// =============================
// Main
// =============================
async function main() {
  if (!NOVELS.length) {
    throw new Error("fixed-novels.json est vide. Ajoute au moins un objet {title, author}.");
  }

  const dateStr = todayISO();
  const dryRun = process.env.DRY_RUN === "true";

  // Sélection auto du roman du jour (boucle) + override facultatif
  const index = getNovelIndexForToday();
  const novel = NOVELS[index];

  console.log("🚀 Génération article littéraire");
  console.log(`📚 ${NOVELS.length} romans chargés — index du jour: ${index}`);
  console.log(`📖 Roman ciblé: "${novel.title}" de ${novel.author}`);
  console.log(`🧠 Modèle Claude: ${CLAUDE_MODEL} | 🖼 Modèle image: ${IMAGE_MODEL}/${IMAGE_QUALITY}`);

  // --- MODE DRY-RUN ---
  if (dryRun) {
    console.log("⚠️ Mode DRY-RUN activé — aucun appel API ne sera fait.");

    const fakeStory: ClaudeResponse = {
      title: `${novel.title} (TEST)`,
      description: `Article fictif pour test sur ${novel.title}`,
      hero_prompt: "Placeholder hero",
      inline_prompt: "Placeholder inline",
      markdown: `# ${novel.title}\n\nCeci est un **test local**. Aucun appel API effectué.`
    };

    const slug = slugify(fakeStory.title) || `${slugify(novel.title)}-${dateStr}`;

    // Bases & sous-dossiers (pour images)
    const { heroBase, inlineBase } = makeBaseNames(dateStr, slug);
    const heroBaseName = heroBase;
    const inlineBaseName = inlineBase;
    const heroDirAbs = path.resolve(IMAGES_DIR, heroBaseName);
    const inlineDirAbs = path.resolve(IMAGES_DIR, inlineBaseName);

    const heroRelPng = `/${path.posix.join("images", "ia", heroBaseName, `${heroBaseName}.png`)}`;
    const inlineRelPng = `/${path.posix.join("images", "ia", inlineBaseName, `${inlineBaseName}.png`)}`;

    console.log("📁 IMAGES_DIR:", path.resolve(IMAGES_DIR));
    console.log("📁 heroDirAbs:", heroDirAbs);
    console.log("📁 inlineDirAbs:", inlineDirAbs);

    // Placeholders (si absents, on génère un PNG 1×1 transparent)
    const heroPlaceholderAbs = path.join(process.cwd(), "public", "images", "placeholders", "hero-portrait.png");
    const inlinePlaceholderAbs = path.join(process.cwd(), "public", "images", "placeholders", "inline-1024.png");

    function readOrDummy(absPath: string) {
      try {
        return fs.readFileSync(absPath);
      } catch {
        console.warn("⚠️ Placeholder introuvable, génération d’un PNG 1×1:", absPath);
        return Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABAgEAz1G9TwAAAABJRU5ErkJggg==",
          "base64"
        );
      }
    }

    try {
      const heroBuf = readOrDummy(heroPlaceholderAbs);
      const inlineBuf = readOrDummy(inlinePlaceholderAbs);

      ensureDir(heroDirAbs);
      ensureDir(inlineDirAbs);
      await writeImageSet(heroDirAbs, heroBaseName, heroBuf);
      await writeImageSet(inlineDirAbs, inlineBaseName, inlineBuf);

      console.log("🧪 [DRY-RUN] Images factices écrites :");
      console.log("   -", path.join(heroDirAbs, `${heroBaseName}.png`));
      console.log("   -", path.join(inlineDirAbs, `${inlineBaseName}.png`));
    } catch (e: any) {
      console.error("❌ [DRY-RUN] Échec écriture images factices:", e?.message);
    }

    // Frontmatter + inline <picture>
    const frontmatterDry =
      `---\n` +
      `title: "${fakeStory.title.replace(/"/g, '\\"')}"\n` +
      `description: "${fakeStory.description.replace(/"/g, '\\"')}"\n` +
      `pubDate: "${dateStr}"\n` +
      `heroImage: "${heroRelPng}"\n` +
      `heroImageAlt: "Illustration: ${fakeStory.title.replace(/"/g, '\\"')}"\n` +
      `---\n\n`;

    const cleanedMdDry = stripLeadingH1(fakeStory.markdown);
    const mdWithImgDry = injectInlineImage(cleanedMdDry, inlineRelPng, `Illustration: ${fakeStory.title}`);

    ensureDir(BLOG_DIR);

    // === Variante B : NOM DE FICHIER = titre.md (sans date) ===
    const cleanSlug = slugifyLite(fakeStory.title || novel.title);
    const fileNameDry = `${cleanSlug}.md`;

    const outPathDry = path.join(BLOG_DIR, fileNameDry);
    fs.writeFileSync(outPathDry, frontmatterDry + mdWithImgDry, "utf8");

    console.log(`✅ [DRY-RUN] Article simulé: ${outPathDry}`);
    process.exit(0);
  }
  // --- FIN DRY-RUN ---

  // ==== Génération réelle ====
  const story = await callClaudeForStory(novel);

  // Anti-dérive : si le titre ne correspond pas à l’œuvre voulue, on force
  if (!story.title?.toLowerCase().includes(novel.title.toLowerCase())) {
    console.warn("⚠️ Le modèle a dérivé: titre renvoyé ≠ œuvre demandée. Titre forcé.");
    story.title = `${novel.title} — Analyse`;
    story.description ||= `Analyse de ${novel.title} de ${novel.author}.`;
  }

  const slug = slugify(story.title) || `${slugify(novel.title)}-${todayISO()}`;

  // Bases & sous-dossiers (pour images)
  const { heroBase, inlineBase } = makeBaseNames(todayISO(), slug);
  const heroBaseName = heroBase;
  const inlineBaseName = inlineBase;

  const heroDirAbs = path.join(IMAGES_DIR, heroBaseName);
  const inlineDirAbs = path.join(IMAGES_DIR, inlineBaseName);
  const heroRelPng = `/${path.posix.join("images", "ia", heroBaseName, `${heroBaseName}.png`)}`;
  const inlineRelPng = `/${path.posix.join("images", "ia", inlineBaseName, `${inlineBaseName}.png`)}`;

  console.log("🎨 Génération images...");
  const heroBuf = await safeGenerateImageBuffer(story.hero_prompt, getPortraitSize(IMAGE_MODEL));
  const inlineBuf = await safeGenerateImageBuffer(story.inline_prompt, "1024x1024");

  if (heroBuf) {
    ensureDir(heroDirAbs);
    await writeImageSet(heroDirAbs, heroBaseName, heroBuf);
  }
  if (inlineBuf) {
    ensureDir(inlineDirAbs);
    await writeImageSet(inlineDirAbs, inlineBaseName, inlineBuf);
  }

  // Chemins finaux (avec fallback si une image a échoué)
  const heroRel = heroBuf ? heroRelPng : `/images/placeholders/hero-portrait.png`;
  const inlineRel = inlineBuf ? inlineRelPng : `/images/placeholders/inline-1024.png`;

  // Nettoyage / injection
  const cleanedMd = stripLeadingH1(story.markdown);
  const mdWithImg = injectInlineImage(cleanedMd, inlineRel, `Illustration: ${story.title}`);

  const frontmatter =
    `---\n` +
    `title: "${story.title.replace(/"/g, '\\"')}"\n` +
    `description: "${story.description.replace(/"/g, '\\"')}"\n` +
    `pubDate: "${todayISO()}"\n` +
    `heroImage: "${heroRel}"\n` +
    `heroImageAlt: "Illustration: ${story.title.replace(/"/g, '\\"')}"\n` +
    `---\n\n`;

  ensureDir(BLOG_DIR);

  // === Variante B : NOM DE FICHIER = titre.md (sans date) ===
  const cleanSlug = slugifyLite(story.title || novel.title);
  const fileName = `${cleanSlug}.md`;
  const outPath = path.join(BLOG_DIR, fileName);

  fs.writeFileSync(outPath, frontmatter + mdWithImg, "utf8");

  console.log(`✅ Article généré: ${outPath}`);
  console.log(`🖼 Hero: ${heroRel} (${heroBuf ? "OK" : "PLACEHOLDER"})`);
  console.log(`🖼 Inline: ${inlineRel} (${inlineBuf ? "OK" : "PLACEHOLDER"})`);
  console.log(`📖 Roman: ${novel.title}`);
}

main().catch((e) => {
  console.error("💥 Échec:", e);
  process.exit(1);
});

export {};
