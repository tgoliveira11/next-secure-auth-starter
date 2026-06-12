import { describe, it, expect } from "vitest";
import { createRoutes } from "@/server/routes/create-routes";
import { SECURE_AUTH_PACKAGE_VERSION } from "@/core/package-version";

describe("health route", () => {
  it("reports the centralized package version", async () => {
    const routes = createRoutes(async () => {
      throw new Error("health route must not load services");
    });
    const response = await routes.health.GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      package: "@tgoliveira/secure-auth",
      version: SECURE_AUTH_PACKAGE_VERSION,
    });
  });
});
