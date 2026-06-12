import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Read source for static security/boundary tests within the package.
 */
export function readModuleSource(relativeToPackageSrc: string): string {
  const absolute = join(packageRoot, relativeToPackageSrc);
  return readFileSync(absolute, "utf8");
}