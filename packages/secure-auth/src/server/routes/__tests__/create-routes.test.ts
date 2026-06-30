import { describe, it, expect } from "vitest";
import { createTestSecureAuth } from "@/test/helpers/create-test-secure-auth";

describe("createRoutes", () => {
  it("exposes health check route", async () => {
    const secureAuth = createTestSecureAuth();
    const response = await secureAuth.routes.health.GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      package: "@tgoliveira/secure-auth",
    });
  });

  it("lazy-loads account profile GET handler", async () => {
    const secureAuth = createTestSecureAuth();
    const response = await secureAuth.routes.accountProfile.GET(new Request("http://localhost"));
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
