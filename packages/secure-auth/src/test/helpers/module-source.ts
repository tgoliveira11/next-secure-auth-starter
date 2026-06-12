import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageSrc = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SHIM_RE =
  /Phase (?:1|2)[^]*?shim[\s\S]*?export \* from "(@\/[^"]+)"/;

function resolveModuleFile(moduleImport: string): string {
  const base = join(packageSrc, moduleImport.replace("@/", ""));
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(`${base}.tsx`)) return `${base}.tsx`;
  if (existsSync(join(base, "index.ts"))) return join(base, "index.ts");
  if (existsSync(join(base, "index.tsx"))) return join(base, "index.tsx");
  return `${base}.ts`;
}

/**
 * Read source for static security/boundary tests within the package.
 * Follows Phase 1/2 re-export shims to the implementation under src/modules.
 */
export function readModuleSource(relativeToPackageSrc: string): string {
  let absolute = join(packageSrc, relativeToPackageSrc);
  let content = readFileSync(absolute, "utf8");
  let depth = 0;

  while (depth < 6) {
    const match = content.match(SHIM_RE);
    if (!match) break;
    absolute = resolveModuleFile(match[1]!);
    content = readFileSync(absolute, "utf8");
    depth += 1;
  }

  return content;
}
