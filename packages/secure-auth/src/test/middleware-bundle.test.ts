import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("next/middleware bundle", () => {
  it("does not include Node-only modules (Edge Runtime safe)", () => {
    const bundlePath = join(import.meta.dirname, "../../dist/next/middleware.js");
    const source = readFileSync(bundlePath, "utf-8");

    expect(source).not.toContain("hibp-checker");
    expect(source).not.toMatch(/from\s+["']crypto["']/);
    expect(source).not.toMatch(/from\s+["']node:crypto["']/);
  });
});
