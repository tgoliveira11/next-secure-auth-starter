import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pkgRequire = createRequire(path.join(packageRoot, "package.json"));
const distRoot = path.join(packageRoot, "dist");
const RELATIVE_DECLARATION_IMPORT =
  /(?:\bfrom\s+|\b(?:import|require)\s*(?:\(\s*)?)["'](\.{1,2}\/[^"']+)["']/g;

function getRelativeDeclarationImports(source: string): string[] {
  return Array.from(source.matchAll(RELATIVE_DECLARATION_IMPORT), (match) => match[1]).filter(
    (specifier): specifier is string => Boolean(specifier)
  );
}

const PUBLIC_ENTRYPOINTS = [
  "@tgoliveira/secure-auth",
  "@tgoliveira/secure-auth/next",
  "@tgoliveira/secure-auth/react",
  "@tgoliveira/secure-auth/react/client",
  "@tgoliveira/secure-auth/email",
  "@tgoliveira/secure-auth/client",
  "@tgoliveira/secure-auth/client/password-policy",
  "@tgoliveira/secure-auth/drizzle/schema",
] as const;

describe("consumer entrypoint compatibility (built package exports)", () => {
  it("recognizes re-exports, side-effect imports, dynamic imports, and require calls", () => {
    expect(
      getRelativeDeclarationImports(`
        export type { A } from "./export.js";
        import "./side-effect.js";
        type B = typeof import("../dynamic.js");
        import C = require("../require.cjs");
      `)
    ).toEqual(["./export.js", "./side-effect.js", "../dynamic.js", "../require.cjs"]);
  });

  it("ships every relative declaration chunk referenced by a public declaration", () => {
    const declarationFiles = readdirSync(distRoot, {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => file.endsWith(".d.ts") || file.endsWith(".d.cts"));
    const missingReferences: string[] = [];

    for (const relativeFile of declarationFiles) {
      const declarationPath = path.join(distRoot, relativeFile);
      const source = readFileSync(declarationPath, "utf8");
      for (const specifier of getRelativeDeclarationImports(source)) {
        const target = path.resolve(path.dirname(declarationPath), specifier);
        const candidates = specifier.endsWith(".cjs")
          ? [target.replace(/\.cjs$/, ".d.cts")]
          : specifier.endsWith(".js") || specifier.endsWith(".mjs")
            ? [target.replace(/\.m?js$/, ".d.ts")]
            : [
                `${target}.d.ts`,
                `${target}.d.cts`,
                path.join(target, "index.d.ts"),
                path.join(target, "index.d.cts"),
              ];

        if (!candidates.some((candidate) => existsSync(candidate))) {
          missingReferences.push(`${relativeFile}: ${specifier}`);
        }
      }
    }

    expect(missingReferences).toEqual([]);
  });

  for (const specifier of PUBLIC_ENTRYPOINTS) {
    it(`supports ESM import for ${specifier}`, async () => {
      const mod = await import(specifier);
      expect(mod).toBeTruthy();
      expect(typeof mod).toBe("object");
    });

    it(`supports CJS require for ${specifier}`, () => {
      try {
        const mod = pkgRequire(specifier);
        expect(mod).toBeTruthy();
        expect(typeof mod).toBe("object");
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;
        const message = error instanceof Error ? error.message : String(error);
        expect(code).not.toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");
        if (specifier === "@tgoliveira/secure-auth/next") {
          expect(message).toMatch(/server-only|Server Component/i);
          return;
        }
        throw error;
      }
    });
  }

  it("exports auth schema tables from drizzle/schema via require", () => {
    const mod = pkgRequire("@tgoliveira/secure-auth/drizzle/schema");
    expect(mod.users).toBeDefined();
    expect(mod.authSchema).toBeDefined();
  });

  it("exports auth schema tables from drizzle/schema via import", async () => {
    const mod = await import("@tgoliveira/secure-auth/drizzle/schema");
    expect(mod.users).toBeDefined();
    expect(mod.authSchema).toBeDefined();
  });
});
