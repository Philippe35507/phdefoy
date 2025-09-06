// scripts/optimize-images.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";

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

  // 1) PNG/JPG ré-encodé (on standardise en PNG optimisé pour rester simple)
  await resized.png({ compressionLevel: 9, palette: true }).toFile(pngPath);

  // 2) WEBP
  await resized.webp({ quality: QUALITY_WEBP, effort: 5 }).toFile(webpPath);

  // 3) AVIF
  await resized.avif({ quality: QUALITY_AVIF, effort: 4 }).toFile(avifPath);

  // Petite note si l'original était JPG, on a maintenant un PNG optimisé comme "source"
  return { pngPath, webpPath, avifPath };
}

// Optimise un fichier trouvé à la racine (le déplace en sous-dossier <base>/<base>.*)
async function optimizeFromRoot(absFile: string) {
  const dir = path.dirname(absFile); // .../public/images/ia
  const ext = path.extname(absFile).toLowerCase() as ".png" | ".jpg" | ".jpeg";
  const base = path.basename(absFile, ext); // ex: 2025-09-07-rama-hero
  const outDir = path.join(dir, base); // .../ia/2025-09-07-rama-hero

  const buf = await fs.promises.readFile(absFile);
  await writeTriple(buf, outDir, base, ext);

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
      // Option: dé-commente si tu veux un log discret
      // console.log("✔️  Déjà optimisé:", path.join(dir, `${base}.*`));
      return;
    }
  
    // 2) Sinon, on (re)génère proprement à partir du fichier rencontré
    const buf = await fs.promises.readFile(absFile);
    await writeTriple(buf, dir, base, ext);
  
    // 3) Nettoie les fichiers qui ne suivent pas la convention
    const entries = await fs.promises.readdir(dir);
    for (const name of entries) {
      const p = path.join(dir, name);
      const st = await fs.promises.stat(p).catch(() => null);
      if (st && st.isFile()) {
        const keep =
          name.toLowerCase() === `${base}.png` ||
          name.toLowerCase() === `${base}.webp` ||
          name.toLowerCase() === `${base}.avif`;
        if (!keep) await fs.promises.unlink(p).catch(() => {});
      }
    }
  
    console.log("🗜️  Optimisé (sous-dossier):", path.join(dir, `${base}.*`));
  }  

// Util pour nettoyer une RegExp à partir d'un baseName
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parcours récursif
async function walk(current: string) {
  const entries = await fs.promises.readdir(current, { withFileTypes: true });

  // D'abord traiter les fichiers à la racine pour les déplacer
  for (const e of entries) {
    if (e.isFile()) {
      const p = path.join(current, e.name);
      if (isPngJpg(p)) {
        // Si on est à SRC_DIR (racine images/ia), déplacement en sous-dossier <base>
        if (current === path.resolve(SRC_DIR)) {
          await optimizeFromRoot(p);
        } else {
          // On est déjà dans un sous-dossier
          await optimizeInSubdir(p);
        }
      }
    }
  }

  // Ensuite descendre dans les dossiers
  for (const e of entries) {
    if (e.isDirectory()) {
      const p = path.join(current, e.name);
      // On évite de re-traiter un dossier qui vient d'être créé à partir d'un fichier de la racine,
      // mais comme on (re)génère simplement base.* dans chaque sous-dossier, c'est idempotent.
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
