import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pkgRequire = createRequire(path.join(packageRoot, "package.json"));

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
