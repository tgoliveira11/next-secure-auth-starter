import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type BoundaryRule = {
  module: string;
  forbidden: RegExp[];
};

const MODULE_ROOT = join(process.cwd(), "src/modules");

const RULES: BoundaryRule[] = [
  {
    module: "auth",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /crypto-client\/letters/],
  },
  {
    module: "account",
    forbidden: [
      /@\/modules\/vault/,
      /@\/modules\/letters/,
      /letter-service|letter-repository/,
      /encryptedTitle|encryptedBody|encryptedLetterKey/,
      /SENTINEL-PRIVATE-LETTER/i,
    ],
  },
  {
    module: "sessions",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /crypto-client\/letters/],
  },
  {
    module: "two-factor",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /crypto-client\/letters/],
  },
  {
    module: "email",
    forbidden: [/@\/modules\/vault/, /@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "audit",
    forbidden: [/@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "rate-limit",
    forbidden: [/@\/modules\/letters/, /encryptedTitle|encryptedBody/],
  },
  {
    module: "security",
    forbidden: [/@\/modules\/letters/, /@\/modules\/vault/],
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

const UI_PRIMITIVE_RULE: BoundaryRule = {
  module: "ui/primitives",
  forbidden: [
    /@\/modules\/auth\/(services|repositories|server)/,
    /@\/modules\/account\/(services|repositories|server)/,
    /@\/modules\/sessions/,
    /@\/modules\/two-factor/,
    /@\/modules\/passkeys/,
    /@\/lib\/db/,
  ],
};

describe("module boundary imports (Phase 1 + Phase 2)", () => {
  for (const rule of [...RULES, UI_PRIMITIVE_RULE]) {
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
