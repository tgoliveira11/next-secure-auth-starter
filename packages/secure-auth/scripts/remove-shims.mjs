#!/usr/bin/env node
/**
 * Removes @deprecated re-export shims and rewires imports to canonical module paths.
 */
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dirname, "../src");

const SHIM_RE =
  /^\/\*\* @deprecated[\s\S]*?export \* from "(@\/[^"]+)";\s*$/m;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      walk(path, files);
    } else if (/\.tsx?$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

const shims = [];
for (const file of walk(SRC)) {
  const content = readFileSync(file, "utf8");
  const match = content.match(SHIM_RE);
  if (!match) continue;
  const shimImport = `@/${relative(SRC, file).replace(/\.tsx?$/, "")}`;
  shims.push({ file, shimImport, target: match[1] });
}

if (shims.length === 0) {
  console.log("No shims found.");
  process.exit(0);
}

console.log(`Found ${shims.length} shims.`);

const allFiles = walk(SRC).filter((f) => !shims.some((s) => s.file === f));

for (const { file, shimImport, target } of shims) {
  let replacements = 0;
  for (const targetFile of allFiles) {
    let content = readFileSync(targetFile, "utf8");
    const patterns = [
      new RegExp(`from "${shimImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"),
      new RegExp(`from '${shimImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`, "g"),
    ];
    let updated = content;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, `from "${target}"`);
    }
    if (updated !== content) {
      writeFileSync(targetFile, updated);
      replacements += 1;
    }
  }
  unlinkSync(file);
  console.log(`Removed ${relative(SRC, file)} -> ${target} (${replacements} files updated)`);
}
