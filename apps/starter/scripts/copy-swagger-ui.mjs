import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = [appRoot, path.join(appRoot, "..", "..")];
const pkgDir = roots
  .map((root) => path.join(root, "node_modules/swagger-ui-dist"))
  .find((dir) => fs.existsSync(path.join(dir, "swagger-ui.css")));

if (!pkgDir) {
  process.exit(0);
}

const publicDir = path.join(appRoot, "public/swagger-ui");
fs.mkdirSync(publicDir, { recursive: true });
for (const file of ["swagger-ui.css", "swagger-ui-bundle.js"]) {
  fs.copyFileSync(path.join(pkgDir, file), path.join(publicDir, file));
}
