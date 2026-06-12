import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const pagesDir = path.resolve("src/modules/ui/pages");

function collectPageSources(dir: string): string[] {
  const sources: string[] = [];
  for (const name of readdirSync(dir)) {
    const filePath = path.join(dir, name);
    if (statSync(filePath).isDirectory()) continue;
    if (!/-page\.tsx$/.test(name)) continue;
    sources.push(readFileSync(filePath, "utf8"));
  }
  return sources;
}

describe("react page client/server boundaries", () => {
  it("page modules do not import server-only package entrypoints", () => {
    const forbidden = ["@tgoliveira/secure-auth/server", "server-only", "/server/"];
    for (const source of collectPageSources(pagesDir)) {
      for (const pattern of forbidden) {
        expect(source.includes(pattern)).toBe(false);
      }
    }
  });

  it("interactive page files are marked use client", () => {
    for (const source of collectPageSources(pagesDir)) {
      expect(source.startsWith('"use client"') || source.startsWith("'use client'")).toBe(true);
    }
  });
});
