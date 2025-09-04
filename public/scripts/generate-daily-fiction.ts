// public/scripts/generate-daily-fiction.ts
// Node >= 18, TS/ESM

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatInTimeZone } from "date-fns-tz";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

console.log("🚀 Boot generate-daily-fiction.ts");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Réglages par défaut (surchargables via .env) ---
const BLOG_DIR = process.env.BLOG_DIR || "src/content/blog/ia";
const IMAGES_DIR = process.env.IMAGES_DIR || "public/images/ia";
const TIMEZONE = process.env.TZ || "Europe/Madrid";

// --- Types utilitaires ---
type OpenAIImageSize =
  | "1792x1024"
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "256x256"
  | "512x512"
  | "1024x1792";

type ClaudeResponse = {
  title: string;
  description: string;
  hero_prompt: string;
  inline_prompt: string;
  markdown: string;
};

// --- Clients API ---
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Genres au hasard ---
const GENRES = [
  "suspense domestique à la Mary Higgins Clark",
  "thriller psychologique contemporain",
  "science-fiction proche (near future)",
  "fantastique discret à la Borges",
  "polar noir urbain",
  "aventure à la Jules Verne moderne",
  "anticipation techno-politique",
  "conte dystopique minimaliste",
  "mystère à huis clos",
  "romanesque grand public façon bestseller",
];

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

async function generateImageToFile(
  prompt: string,
  outPath: string,
  size: OpenAIImageSize = "512x512"
) {
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,           // 1024x1024 pour hero, 512x512 pour inline
    quality: "low", // ✅ baisse le coût
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image generation failed (no b64_json).");
  const buf = Buffer.from(b64, "base64");
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, buf);
}

function isOpenAIForbidden(e: any) {
  return e?.status === 403 || e?.code === "invalid_request_error";
}

async function safeGenerateImage(prompt: string, outPath: string, size: OpenAIImageSize) {
  try {
    await generateImageToFile(prompt, outPath, size);
    return true;
  } catch (e: any) {
    console.warn("⚠️ Image OpenAI indisponible:", e?.status || e?.code, e?.error?.message || e?.message);
    return false;
  }
}

function injectInlineImage(markdown: string, inlineImageRel: string, alt: string) {
  const imgMd = `\n\n![${alt}](${inlineImageRel})\n\n`;
  const idx = markdown.indexOf("\n## ");
  if (idx !== -1) return markdown.slice(0, idx) + imgMd + markdown.slice(idx);
  return markdown + imgMd;
}

async function callClaudeForStory(genre: string): Promise<ClaudeResponse> {
  const system = `Tu es un écrivain professionnel qui produit des nouvelles efficaces et grand public.`;

  const user = `Écris une nouvelle originale en **français** dans le genre: "${genre}".

Contraintes IMPÉRATIVES :
- Longueur : **entre 1 200 et 1 600 mots** (ne pas rester en dessous de 1 200).
- Style : fluide, accessible, immersif ; narration claire (grand public).
- Structure Markdown :
  1) "# Titre"
  2) un paragraphe d'introduction
  3) 3 à 5 sections "## ..."
  4) une conclusion
- Zéro front-matter dans la sortie.
- Pas de contenu offensant ; public adulte non explicite.
- 100 % original, pas de copier-coller, pas de révélations méta-modèle.

À la **toute fin**, fournis **un objet JSON strict** sur une seule ligne, sans texte avant/après :
{"title":"...","description":"(<=160 car.)","hero_prompt":"(visuel large, cinématique)","inline_prompt":"(visuel scène clé)"}

Rappels :
- "description" = pitch court et alléchant (<=160 caractères).
- Ne **raccourcis pas** la nouvelle pour caser le JSON : la nouvelle doit **dépasser 1 200 mots** avant le JSON.`;

  // 1) Première passe : histoire complète + JSON meta
  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 7000, // marge de sortie 1200–1600 mots
    temperature: 0.8,
    top_p: 0.9,
    system,
    messages: [{ role: "user", content: user }],
  });

  const fullFirst =
    msg.content?.map((c: any) => ("text" in c ? (c as any).text : "")).join("\n") ?? "";

  const jsonMatch = fullFirst.match(/\{[\s\S]*\}\s*$/);
  if (!jsonMatch) throw new Error("JSON introuvable en fin de réponse Claude.");
  const meta = JSON.parse(jsonMatch[0]) as {
    title: string;
    description: string;
    hero_prompt: string;
    inline_prompt: string;
  };

  const markdownInitial = fullFirst.replace(jsonMatch[0], "").trim();
  const hasH1 = /^#\s+.+/m.test(markdownInitial);
  const titleLine = `# ${meta.title}\n\n`;
  let finalMd = hasH1 ? markdownInitial : titleLine + markdownInitial;

  // 2) Filet de sécurité : si trop court, demander un complément
  const wordCount = finalMd.split(/\s+/).filter(Boolean).length;

  if (wordCount < 1100) {
    const extend = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 3000,
      temperature: 0.7,
      system,
      messages: [
        {
          role: "user",
          content:
            `Complète la nouvelle précédente pour atteindre **entre 1 300 et 1 500 mots** au total.
- Continue naturellement à partir de la dernière section, sans revenir en arrière.
- N'ajoute **pas** de titre ni de front-matter, **pas** de JSON, uniquement du **Markdown** (sections/paragraphes).
- Garde le ton et le rythme cohérents.`,
        },
      ],
    });

    const extra =
      extend.content?.map((c: any) => ("text" in c ? (c as any).text : "")).join("\n") ??
      "";
    finalMd = (finalMd + "\n\n" + extra).trim();
  }

  // 3) Retour standardisé
  return {
    title: meta.title,
    description: (meta.description || "").slice(0, 160),
    hero_prompt: meta.hero_prompt,
    inline_prompt: meta.inline_prompt,
    markdown: finalMd,
  };
}

async function main() {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
  const dateStr = todayISO();
  console.log(`🖊️  Génération en cours — genre: ${genre}`);

  // --- Récupérer l'histoire (story) ---
  const story = await callClaudeForStory(genre);

  // --- Préparer noms de fichiers / chemins ---
  const slug = slugify(story.title) || `nouvelle-${dateStr}`;
  const heroFile = `${slug}-hero.png`;
  const inlineFile = `${slug}-inline.png`;
  const heroAbs = path.join(IMAGES_DIR, heroFile);
  const inlineAbs = path.join(IMAGES_DIR, inlineFile);

  // --- Générer images (éco) ---
  console.log("🎨 Génération images (OpenAI, low cost)...");

  // Essaye de générer, sinon fallback
  const okHero = await safeGenerateImage(story.hero_prompt, heroAbs, "1024x1024");
  const okInline = await safeGenerateImage(story.inline_prompt, inlineAbs, "512x512");
  
  // Si échec, utilise un placeholder local
  const heroRel = okHero
    ? `/${path.posix.join("images", "ia", heroFile)}`
    : `/images/placeholders/hero-1024.png`;
  
  const inlineRel = okInline
    ? `/${path.posix.join("images", "ia", inlineFile)}`
    : `/images/placeholders/inline-512.png`;
  

  // --- Injecter image dans le corps ---
  const mdWithImg = injectInlineImage(
    story.markdown,
    inlineRel,
    `Illustration: ${story.title}`
  );

  // --- Front-matter YAML ---
  const frontmatter =
    `---\n` +
    `title: "${story.title.replace(/"/g, '\\"')}"\n` +
    `description: "${story.description.replace(/"/g, '\\"')}"\n` +
    `pubDate: "${dateStr}"\n` +
    `heroImage: "${heroRel}"\n` +
    `heroImageAlt: "Illustration originale: ${story.title.replace(/"/g, '\\"')}"\n` +
    `---\n\n`;

  // --- Écrire le fichier markdown ---
  ensureDir(BLOG_DIR);
  const fileName = `${dateStr}-${slug}.md`;
  const outPath = path.join(BLOG_DIR, fileName);
  fs.writeFileSync(outPath, frontmatter + mdWithImg, "utf8");

  console.log(`✅ Article généré: ${outPath}`);
  console.log(`🖼  Hero: ${heroRel}`);
  console.log(`🖼  Inline: ${inlineRel}`);
  console.log(`💰 Estimation coût images : ~0.02 USD / article (1024 low + 512 low)`);
}

// Lance toujours le script quand on l'appelle avec `npm run generate:blog`
main().catch((e) => {
  console.error("💥 Échec:", e);
  process.exit(1);
});

export {};
