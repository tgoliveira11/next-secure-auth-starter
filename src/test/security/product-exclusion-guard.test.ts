import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SRC_ROOT = path.join(REPO_ROOT, "src");

const FORBIDDEN_PATHS = [
  "src/app/letters",
  "src/app/vault",
  "src/app/api/letters",
  "src/app/api/vault",
  "src/modules/letters",
  "src/modules/vault",
  "src/features/letters",
  "src/features/vault",
  "src/lib/crypto-client",
  "src/server/services/letter",
  "src/server/services/vault",
  "src/server/repositories/letter",
  "src/server/repositories/vault",
];

const FORBIDDEN_STRINGS = [
  "User Vault Key",
  "Letter Key",
  "passkey PRF vault envelope",
  "letters-to-god",
  "Letters to God",
  "Private Letters Vault",
  "encrypted private letters",
];

const SCAN_ROOTS = [
  path.join(SRC_ROOT, "app"),
  path.join(SRC_ROOT, "modules"),
  path.join(SRC_ROOT, "features"),
  path.join(SRC_ROOT, "components"),
  path.join(SRC_ROOT, "lib"),
  path.join(SRC_ROOT, "server"),
  path.join(SRC_ROOT, "middleware.ts"),
];

function collectFiles(entryPath: string): string[] {
  if (!existsSync(entryPath)) return [];
  const stat = statSync(entryPath);
  if (stat.isFile()) return [entryPath];
  const files: string[] = [];
  for (const name of readdirSync(entryPath)) {
    if (name === "test" || name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
    files.push(...collectFiles(path.join(entryPath, name)));
  }
  return files;
}

describe("product exclusion guard", () => {
  it("does not contain vault/letters route or module directories", () => {
    for (const relative of FORBIDDEN_PATHS) {
      expect(existsSync(path.join(REPO_ROOT, relative)), relative).toBe(false);
    }
  });

  it("does not reintroduce product-specific strings in application source", () => {
    const files = SCAN_ROOTS.flatMap((root) => collectFiles(root)).filter((file) =>
      /\.(ts|tsx)$/.test(file)
    );

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const phrase of FORBIDDEN_STRINGS) {
        if (content.includes(phrase)) {
          violations.push(`${path.relative(REPO_ROOT, file)}: "${phrase}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
