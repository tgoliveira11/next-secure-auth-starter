import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const scanRoots = [
  path.resolve("src/app"),
  path.resolve("src/lib"),
  path.resolve("src/components"),
];

const forbiddenPatterns = [
  "apps/starter",
  "packages/secure-auth/src",
  "@tgoliveira/secure-auth/server",
  "createRoutes",
  "createAuthServices",
  "initSecureAuthRuntime",
  "getSecureAuthConfig",
  "getSecureAuthDb",
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const filePath = path.join(dir, name);
    if (statSync(filePath).isDirectory()) {
      files.push(...collectSourceFiles(filePath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) files.push(filePath);
  }
  return files;
}

describe("consumer-demo import boundaries", () => {
  it("uses only supported public package exports in app code", () => {
    const files = scanRoots.flatMap((dir) => collectSourceFiles(dir));
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(source.includes(pattern)).toBe(false);
      }
    }
  });
});
