// scripts/optimize-images.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { formatInTimeZone } from "date-fns-tz";

if (process.env.DRY_RUN === "true") {
  console.log("⏭️ DRY_RUN détecté — on saute l’optimisation.");
  process.exit(0);
}

const TIMEZONE = process.env.TZ || "Europe/Madrid";
const TODAY = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

// un sous-dossier images valide pour aujourd’hui commence par "YYYY-MM-DD-"
function isTodayBase(name: string) {
  return name.startsWith(`${TODAY}-`);
}

const SRC_DIR = "public/images/ia";
const MAX_WIDTH = 1600;
const QUALITY_WEBP = 82;
const QUALITY_AVIF = 60;

// Détermine si c'est une image cible
function isPngJpg(file: string) {
  return /\.(png|jpg|jpeg)$/i.test(file);
}

// Ré-encode + génère les 3 formats dans un sous-dossier
async function writeTriple(
  inputBuffer: Buffer,
  outDir: string,
  baseName: string,
  origExt: ".png" | ".jpg" | ".jpeg"
) {
  await fs.promises.mkdir(outDir, { recursive: true });

  const pngPath = path.join(outDir, `${baseName}.png`);
  const webpPath = path.join(outDir, `${baseName}.webp`);
  const avifPath = path.join(outDir, `${baseName}.avif`);

  const img = sharp(inputBuffer, { failOn: "none" }).withMetadata();
  const meta = await img.metadata();
  const resized = (meta.width ?? 0) > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;

  // 1) PNG optimisé
  await resized.png({ compressionLevel: 9, palette: true }).toFile(pngPath);
  // 2) WEBP
  await resized.webp({ quality: QUALITY_WEBP, effort: 5 }).toFile(webpPath);
  // 3) AVIF
  await resized.avif({ quality: QUALITY_AVIF, effort: 4 }).toFile(avifPath);

  return { pngPath, webpPath, avifPath };
}

// Optimise un fichier trouvé à la racine (le déplace en sous-dossier <base>/<base>.*)
async function optimizeFromRoot(absFile: string) {
  const dir = path.dirname(absFile); // .../public/images/ia
  const ext = path.extname(absFile).toLowerCase() as ".png" | ".jpg" | ".jpeg";
  const base = path.basename(absFile, ext); // ex: 2025-09-07-rama-hero
  const outDir = path.join(dir, base); // .../ia/2025-09-07-rama-hero

  const buf = await fs.promises.readFile(absFile);
  try {
    await writeTriple(buf, outDir, base, ext);
  } catch (e: any) {
    console.error("❌ Sharp a échoué pour:", absFile, "-", e?.message);
    return;
  }

  // Supprime l'original à la racine
  await fs.promises.unlink(absFile).catch(() => {});
  console.log("🗜️  Optimisé (déplacé):", path.join(outDir, `${base}.*`));
}

// Optimise un fichier déjà en sous-dossier : <...>/<base>/<quelquechose>.png
// On normalise pour produire <base>.png|webp|avif dans ce même dossier.
async function optimizeInSubdir(absFile: string) {
  const dir = path.dirname(absFile);           // .../ia/<base>
  const folderName = path.basename(dir);       // <base> attendu
  const ext = path.extname(absFile).toLowerCase() as ".png" | ".jpg" | ".jpeg";
  const base = folderName;

  const basePng  = path.join(dir, `${base}.png`);
  const baseWebp = path.join(dir, `${base}.webp`);
  const baseAvif = path.join(dir, `${base}.avif`);

  // 1) Si le triplet existe déjà, on SKIP silencieusement
  const hasAll =
    fs.existsSync(basePng) &&
    fs.existsSync(baseWebp) &&
    fs.existsSync(baseAvif);

  if (hasAll) {
    // console.log("✔️  Déjà optimisé:", path.join(dir, `${base}.*`));
    return;
  }

  // 2) Sinon, on (re)génère proprement à partir du fichier rencontré
  const buf = await fs.promises.readFile(absFile);
  try {
    await writeTriple(buf, dir, base, ext);
  } catch (e: any) {
    console.error("❌ Sharp a échoué pour:", absFile, "-", e?.message);
    return;
  }

  // 3) Nettoie les fichiers qui ne suivent pas la convention
  const entries = await fs.promises.readdir(dir);
  for (const name of entries) {
    const p = path.join(dir, name);
    const st = await fs.promises.stat(p).catch(() => null);
    if (st && st.isFile()) {
      const keep =
        name.toLowerCase() === `${base}.png` ||
        name.toLowerCase() === `${base}.webp` ||
        name.toLowerCase() === `${base}.avif` ||
        name.toLowerCase() === "readme.md" ||
        name === ".gitkeep";
      if (!keep) await fs.promises.unlink(p).catch(() => {});
    }
  }

  console.log("🗜️  Optimisé (sous-dossier):", path.join(dir, `${base}.*`));
}

// Parcours récursif
async function walk(current: string) {
  const entries = await fs.promises.readdir(current, { withFileTypes: true });

  // Si on n’est PAS à la racine SRC_DIR, on vérifie que le dossier courant est bien "du jour"
  // Exemple de dossier: public/images/ia/<base>
  if (current !== path.resolve(SRC_DIR)) {
    const folderName = path.basename(current);
    if (!isTodayBase(folderName)) {
      // on saute ce sous-dossier (ancien)
      return;
    }
  }

  // 1) Traiter les fichiers trouvés (seulement PNG/JPG)
  for (const e of entries) {
    if (e.isFile()) {
      const p = path.join(current, e.name);
      if (isPngJpg(p)) {
        if (current === path.resolve(SRC_DIR)) {
          // Fichier à la racine -> on le range dans son sous-dossier <base>/<base>.*
          await optimizeFromRoot(p);
        } else {
          // Fichier déjà en sous-dossier du JOUR -> on (re)génère si besoin
          await optimizeInSubdir(p);
        }
      }
    }
  }

  // 2) Descendre dans les sous-dossiers (mais "du jour" uniquement grâce au test plus haut)
  for (const e of entries) {
    if (e.isDirectory()) {
      const p = path.join(current, e.name);
      await walk(p);
    }
  }
}

async function main() {
  const root = path.resolve(SRC_DIR);
  try {
    const st = await fs.promises.stat(root);
    if (!st.isDirectory()) {
      console.error("❌ SRC_DIR n'est pas un dossier:", root);
      process.exit(1);
    }
  } catch {
    console.error("❌ SRC_DIR introuvable:", root);
    process.exit(1);
  }

  console.log("🔎 Optimisation images dans:", root);
  await walk(root);
  console.log("✅ Optimisation terminée.");
}

main().catch((e) => {
  console.error("💥 Échec optimisation:", e);
  process.exit(1);
});
