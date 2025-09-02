#!/usr/bin/env node
import { execSync } from "node:child_process";

function sh(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}
function shOut(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
}

const msg =
  process.argv.slice(2).join(" ") ||
  `update ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

try { sh("git add -A"); } catch {}
let committed = true;
try { sh(`git commit -m "${msg.replace(/"/g, '\\"')}"`); }
catch { committed = false; /* rien à committer, on peut quand même pousser */ }

let upstream = "";
try { upstream = shOut("git rev-parse --abbrev-ref --symbolic-full-name @{u}"); } catch {}
const branch = shOut("git rev-parse --abbrev-ref HEAD");
const pushCmd = upstream ? "git push" : `git push -u origin ${branch}`;

sh(pushCmd);
if (!committed) {
  console.error("ℹ️ Aucun changement à committer (push effectué si nécessaire).");
}
