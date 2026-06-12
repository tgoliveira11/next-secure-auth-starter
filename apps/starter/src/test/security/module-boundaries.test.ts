import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type BoundaryRule = {
  module: string;
  forbidden: RegExp[];
};

const MODULE_ROOT = join(process.cwd(), "src/modules");

/** Phase 10: only app-owned email adapter remains under src/modules. */
const RULES: BoundaryRule[] = [
  {
    module: "email",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
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

describe("module boundary imports (starter app-owned modules)", () => {
  for (const rule of RULES) {
    it(`${rule.module} must not import forbidden modules`, () => {
      const moduleDir = join(MODULE_ROOT, rule.module);
      const files = collectSourceFiles(moduleDir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = readFileSync(file, "utf8");
        for (const pattern of rule.forbidden) {
          expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    });
  }
});
