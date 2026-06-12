import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API_ROOT = join(process.cwd(), "src/app/api");

function collectRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (entry === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

const appOwnedRoutePrefixes = ["openapi", "auth/[...nextauth]"];

const packageOwnedRoutes = collectRouteFiles(API_ROOT).filter((path) => {
  const rel = relative(API_ROOT, path);
  return !appOwnedRoutePrefixes.some((prefix) => rel.startsWith(prefix));
});

describe("starter API route wrappers", () => {
  it.each(
    packageOwnedRoutes.map((file) => [relative(API_ROOT, file), file] as const)
  )("%s delegates to secureAuth.routes", (_label, filePath) => {
    const source = readFileSync(filePath, "utf8");
    expect(source).toContain('import { secureAuth } from "@/lib/secure-auth"');
    expect(source).toMatch(/secureAuth\.routes\.\w+/);
    expect(source).not.toMatch(/from "@\/server\/routes/);
    expect(source).not.toMatch(/from "@\/modules\//);
  });

  it("openapi route remains app-owned", async () => {
    const source = readFileSync(join(API_ROOT, "openapi/route.ts"), "utf8");
    expect(source).not.toContain("secureAuth.routes");
    const { GET } = await import("@/app/api/openapi/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("openapi");
  });

  it("nextauth route remains app-owned for next-auth bundling boundary", async () => {
    const source = readFileSync(join(API_ROOT, "auth/[...nextauth]/route.ts"), "utf8");
    expect(source).not.toContain("secureAuth.routes");
    expect(source).toContain("@/lib/nextauth-route");
    const nextAuthRoute = readFileSync(join(process.cwd(), "src/lib/nextauth-route.ts"), "utf8");
    expect(nextAuthRoute).toContain('from "next-auth"');
    expect(nextAuthRoute).toContain("createNextAuthRouteHandlers");
  });
});

describe("secureAuth wiring", () => {
  it("exposes route handlers for all starter API wrappers", async () => {
    const { secureAuth } = await import("@/lib/secure-auth");
    expect(secureAuth.routes.register.POST).toBeTypeOf("function");
    expect(secureAuth.routes.loginStart.POST).toBeTypeOf("function");
    expect(secureAuth.routes.account.GET).toBeTypeOf("function");
    expect(secureAuth.routes.nextAuth.GET).toBeTypeOf("function");
    expect(secureAuth.routes.sessionsList.GET).toBeTypeOf("function");
    expect(secureAuth.routes.twoFactorStatus.GET).toBeTypeOf("function");
    expect(secureAuth.routes.passkeyLoginOptions.POST).toBeTypeOf("function");
  });
});
