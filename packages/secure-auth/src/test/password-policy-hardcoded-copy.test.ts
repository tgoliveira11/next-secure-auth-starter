import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const UI_SOURCE_ROOT = join(process.cwd(), "src/modules/ui");

const HARDCODED_COPY_PATTERNS = [/At least 12/, /Use at least 12/];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "__tests__") continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("password policy UI copy", () => {
  it("does not hardcode default min-length user-facing copy in package UI sources", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(UI_SOURCE_ROOT)) {
      const content = readFileSync(file, "utf8");
      for (const pattern of HARDCODED_COPY_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(file);
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
