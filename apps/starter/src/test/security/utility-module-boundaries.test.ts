import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MODULE_ROOT = join(process.cwd(), "src/modules");

/** Phase 10: starter keeps only the email delivery adapter under src/modules. */
const UTILITY_CORE_DIRS = ["email/core", "email/templates"] as const;

const FORBIDDEN_PRODUCT_IMPORTS = [
  /@\/modules\/vault/,
  /@\/modules\/letters/,
  /crypto-client\/letters/,
  /encryptedTitle|encryptedBody|encryptedLetterKey/,
  /SENTINEL-PRIVATE-LETTER/i,
];

function collectSourceFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("utility module boundaries (starter email adapter)", () => {
  for (const relativeDir of UTILITY_CORE_DIRS) {
    it(`${relativeDir} must stay account-auth scoped`, () => {
      const dir = join(MODULE_ROOT, relativeDir);
      const files = collectSourceFiles(dir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = readFileSync(file, "utf8");
        for (const pattern of FORBIDDEN_PRODUCT_IMPORTS) {
          expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  }
});
