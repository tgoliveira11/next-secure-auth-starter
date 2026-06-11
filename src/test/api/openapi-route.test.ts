import { describe, it, expect, vi } from "vitest";

describe("GET /api/openapi", () => {
  it("returns OpenAPI 3 spec for Next Secure Auth Starter", async () => {
    const { GET } = await import("@/app/api/openapi/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toContain("Next Secure Auth Starter");
    expect(spec.info.description.toLowerCase()).toContain("account and authentication");
  });

  it("returns 500 when the spec file cannot be read", async () => {
    vi.resetModules();
    vi.doMock("fs", () => ({
      readFileSync: () => {
        throw new Error("missing spec");
      },
    }));
    const { GET } = await import("@/app/api/openapi/route");
    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "OpenAPI spec unavailable" });
    vi.doUnmock("fs");
    vi.resetModules();
  });
});
