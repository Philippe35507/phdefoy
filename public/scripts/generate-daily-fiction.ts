// public/scripts/generate-daily-fiction.ts
// Node >= 18, TS/ESM

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatInTimeZone } from "date-fns-tz";
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages.mjs";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Réglages par défaut ---
const BLOG_DIR = process.env.BLOG_DIR || "src/content/blog/ia";
const IMAGES_DIR = process.env.IMAGES_DIR || "public/images/ia";
const TIMEZONE = process.env.TZ || "Europe/Madrid";

// --- Types utilitaires ---
type OpenAIImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "1024x1792" | "1792x1024";

type ClaudeResponse = {
  title: string;
  description: string;
  hero_prompt: string;
  inline_prompt: string;
  markdown: string;
};

// --- Liste fixe de romans ---
const FIXED_NOVELS = [
  {
    title: "La Nuit des temps",
    author: "René Barjavel",
    genre: "Science-fiction / Romance tragique",
    year: "1968",
    themes: ["civilisation perdue", "amour éternel", "guerre", "pacifisme", "tragédie"],
    context:
      "Sous la glace de l’Antarctique, une expédition découvre une civilisation vieille de 900 000 ans et les derniers amants de ce monde englouti : Éléa et Païkan. Leur histoire mêle science-fiction et drame universel.",
    impact:
      "Roman culte de la SF française, couronné par le prix des Libraires en 1969. Symbole de l’écriture poétique et humaniste de Barjavel, il reste une référence majeure de la littérature d’anticipation francophone."
  }
];

// Sujet aléatoire simplifié
function pickRandomNovel() {
  return FIXED_NOVELS[Math.floor(Math.random() * FIXED_NOVELS.length)];
}

// Clients API
const anthropic = new Anthropic({
  apiKey: (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim()
});

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "").trim()
});

// Modèles
const CLAUDE_MODEL = (process.env.CLAUDE_MODEL || "claude-3-7-sonnet-20250219").trim();
const IMAGE_MODEL = (process.env.IMAGE_MODEL || "gpt-image-1").trim();

let IMAGE_QUALITY = (process.env.IMAGE_QUALITY || "medium").trim();
if (IMAGE_QUALITY.toLowerCase() === "low") IMAGE_QUALITY = "medium";

// --- Helpers tailles images ---
function getPortraitSize(model: string): "1024x1536" | "1024x1792" {
  if (model.includes("gpt-image-1")) return "1024x1536"; // portrait GPT-Image-1
  return "1024x1792"; // portrait DALL·E 3
}

function getLandscapeSize(model: string): "1536x1024" | "1792x1024" {
  if (model.includes("gpt-image-1")) return "1536x1024"; // paysage GPT-Image-1
  return "1792x1024"; // paysage DALL·E 3
}

// Utils
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

function todayISO(date = new Date()) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

// Instructions simplifiées pour Claude
function buildUserPrompt(novel: typeof FIXED_NOVELS[0]): string {
  return `Rédige un article de blog engageant sur "${novel.title}" de ${novel.author}.

L'article doit :
- Faire environ 800-1000 mots
- Commencer par un titre H1 informatif
- Avoir une introduction claire qui présente l'œuvre
- Analyser les thèmes principaux : ${novel.themes.join(", ")}
- Situer l'œuvre dans son contexte historique (publié en ${novel.year})
- Examiner la résonance actuelle du livre
- Conclure de manière réfléchie
- Adopter un ton accessible et informé

Écris un article de qualité qui éclaire le lecteur sur cette œuvre majeure.

À la fin de ta réponse, ajoute sur une ligne séparée uniquement :
{"title":"[titre exact]","description":"[description SEO 150 caractères]","hero_prompt":"[description artistique pour image de couverture]","inline_prompt":"[description pour illustration du livre]"}`;
}

// Retry Anthropic
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

// Génération image
async function generateImageToFile(prompt: string, outPath: string, size: OpenAIImageSize) {
  try {
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

    let buffer: Buffer;
    if (b64) {
      buffer = Buffer.from(b64, "base64");
    } else if (url) {
      console.log(`📥 Téléchargement image: ${url.slice(0, 70)}...`);
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) throw new Error(`Erreur téléchargement: ${fetchResponse.status}`);
      const arrayBuffer = await fetchResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("Ni b64 ni url disponible");
    }

    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ Image sauvée: ${outPath} (${(buffer.length / 1024).toFixed(1)}KB)`);
    return true;
  } catch (error: any) {
    console.error("❌ Erreur génération image:", error.message);
    return false;
  }
}

async function safeGenerateImage(prompt: string, outPath: string, size: OpenAIImageSize) {
  try {
    return await generateImageToFile(prompt, outPath, size);
  } catch (e: any) {
    console.warn("⚠️ Image OpenAI indisponible:", e?.message);
    return false;
  }
}

function injectInlineImage(markdown: string, inlineImageRel: string, alt: string) {
  const imgMd = `\n\n![${alt}](${inlineImageRel})\n\n`;
  const idx = markdown.indexOf("\n## ");
  if (idx !== -1) return markdown.slice(0, idx) + imgMd + markdown.slice(idx);
  return markdown + imgMd;
}

function stripLeadingH1(markdown: string) {
  return markdown.replace(/^#\s+.*\r?\n(?:\r?\n)*/m, "");
}

// Appel Claude
async function callClaudeForStory(novel: typeof FIXED_NOVELS[0]): Promise<ClaudeResponse> {
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
    const title = h1Match ? h1Match[1].trim() : `${novel.title} - Analyse critique`;
    meta = {
      title,
      description: `Analyse passionnante de ${novel.title} de ${novel.author}.`,
      hero_prompt: `Illustration portrait du livre ${novel.title}, style littéraire`,
      inline_prompt: `Illustration symbolique des thèmes de ${novel.title}`
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

// Main
async function main() {
  const novel = pickRandomNovel();
  const dateStr = todayISO();

  console.log("🚀 Génération article littéraire");
  console.log(`📚 Roman sélectionné: "${novel.title}" de ${novel.author} (${novel.year})`);
  console.log(`🧠 Modèle Claude: ${CLAUDE_MODEL} | 🖼 Modèle image: ${IMAGE_MODEL}/${IMAGE_QUALITY}`);

  const story = await callClaudeForStory(novel);

  const slug = slugify(story.title) || `${slugify(novel.title)}-${dateStr}`;
  const heroFile = `${slug}-hero.png`;
  const inlineFile = `${slug}-inline.png`;
  const heroAbs = path.join(IMAGES_DIR, heroFile);
  const inlineAbs = path.join(IMAGES_DIR, inlineFile);

  console.log("🎨 Génération images...");
  const okHero = await safeGenerateImage(story.hero_prompt, heroAbs, getPortraitSize(IMAGE_MODEL));
  const okInline = await safeGenerateImage(story.inline_prompt, inlineAbs, "1024x1024");

  const heroRel = okHero
    ? `/${path.posix.join("images", "ia", heroFile)}`
    : `/images/placeholders/hero-portrait.png`;

  const inlineRel = okInline
    ? `/${path.posix.join("images", "ia", inlineFile)}`
    : `/images/placeholders/inline-1024.png`;

  const cleanedMd = stripLeadingH1(story.markdown);
  const mdWithImg = injectInlineImage(cleanedMd, inlineRel, `Illustration: ${story.title}`);

  const frontmatter =
    `---\n` +
    `title: "${story.title.replace(/"/g, '\\"')}"\n` +
    `description: "${story.description.replace(/"/g, '\\"')}"\n` +
    `pubDate: "${dateStr}"\n` +
    `heroImage: "${heroRel}"\n` +
    `heroImageAlt: "Illustration: ${story.title.replace(/"/g, '\\"')}"\n` +
    `---\n\n`;

  ensureDir(BLOG_DIR);
  const fileName = `${dateStr}-${slug}.md`;
  const outPath = path.join(BLOG_DIR, fileName);
  fs.writeFileSync(outPath, frontmatter + mdWithImg, "utf8");

  console.log(`✅ Article généré: ${outPath}`);
  console.log(`🖼 Hero: ${heroRel} (${okHero ? "OK" : "PLACEHOLDER"})`);
  console.log(`🖼 Inline: ${inlineRel} (${okInline ? "OK" : "PLACEHOLDER"})`);
  console.log(`📖 Roman: ${novel.title} (${novel.genre})`);
}

main().catch((e) => {
  console.error("💥 Échec:", e);
  process.exit(1);
});

export {};
