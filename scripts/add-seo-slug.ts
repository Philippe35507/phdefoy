import fs from "fs";
import path from "path";

const ROOT = "src/content/blog";

function slugifyLite(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFrontmatter(src: string) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: null, body: src };
  const fmRaw = m[1];
  const body = src.slice(m[0].length);
  const fm: Record<string, any> = {};
  for (const line of fmRaw.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    // enlève guillemets simples/doubles autour
    val = val.replace(/^['"]|['"]$/g, "");
    fm[key] = val;
  }
  return { fm, body, fmBlock: m[0] };
}

function buildFrontmatter(fm: Record<string, any>) {
  const lines = Object.entries(fm).map(([k,v]) => `${k}: "${String(v).replace(/"/g,'\\"')}"`);
  return `---\n${lines.join("\n")}\n---\n`;
}

async function main() {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith(".md"));
  let changed = 0;

  for (const file of files) {
    const abs = path.join(ROOT, file);
    const src = fs.readFileSync(abs, "utf8");
    const { fm, body } = parseFrontmatter(src);
    if (!fm) {
      console.warn("⚠️ Pas de frontmatter:", file);
      continue;
    }
    if (fm.seoSlug) {
      continue; // déjà fait
    }
    const title = fm.title || "";
    const author = fm.author || ""; // si tu as 'author' dans tes anciens posts
    const seoSlug = author ? `${slugifyLite(author)}-${slugifyLite(title)}`
                           : slugifyLite(title);
    fm.seoSlug = seoSlug;

    const out = buildFrontmatter(fm) + "\n" + body.replace(/^\r?\n/, "");
    fs.writeFileSync(abs, out, "utf8");
    console.log("✅ seoSlug ajouté:", file, "→", seoSlug);
    changed++;
  }

  console.log(changed ? `✨ Mis à jour: ${changed} fichier(s)` : "Aucun fichier à mettre à jour.");
}

main();
