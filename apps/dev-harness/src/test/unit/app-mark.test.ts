import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBrandMarkSvg } from "@tgoliveira/secure-auth/client";
import { APP_NAME } from "@/lib/brand";

describe("app brand icon", () => {
  it("uses design-system colors in favicon SVG", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    expect(icon).toContain("#1e3a5f");
    expect(icon).toContain("#faf8f5");
    expect(icon).toContain("#3b82f6");
    expect(icon).toContain(`aria-label="${APP_NAME}"`);
  });

  it("keeps shared brand mark aligned with favicon file", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    const normalize = (value: string) => value.replace(/\s+/g, " ").replace(/ \/>/g, "/>").trim();
    expect(normalize(buildBrandMarkSvg(APP_NAME))).toBe(normalize(icon));
  });
});
