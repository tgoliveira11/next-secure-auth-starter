import { describe, it, expect } from "vitest";
import { createTestSecureAuth, buildTestSecureAuthConfig } from "./helpers/create-test-secure-auth.js";

describe("createSecureAuth runtime isolation", () => {
  it("does not leak config between two instances", async () => {
    const first = createTestSecureAuth({
      app: { name: "First App", slug: "first-app", baseUrl: "http://first.local" },
    });
    const second = createTestSecureAuth({
      app: { name: "Second App", slug: "second-app", baseUrl: "http://second.local" },
    });

    const firstServices = await first.getServices();
    const secondServices = await second.getServices();

    expect(firstServices.config.app.slug).toBe("first-app");
    expect(secondServices.config.app.slug).toBe("second-app");
    expect(firstServices.ctx.getAppSlug()).toBe("first-app");
    expect(secondServices.ctx.getAppSlug()).toBe("second-app");
    expect(firstServices.ctx.getLoginPendingTokenCookieName()).not.toBe(
      secondServices.ctx.getLoginPendingTokenCookieName()
    );
  });

  it("uses distinct rate limit adapters per instance", async () => {
    const first = createTestSecureAuth();
    const second = createTestSecureAuth();

    const firstServices = await first.getServices();
    const secondServices = await second.getServices();

    const firstAdapter = new (await import("../modules/rate-limit/adapters/in-memory-adapter.js")).InMemoryRateLimitAdapter();
    firstServices.rateLimit.setAdapterForTests(firstAdapter);

    await firstServices.rateLimit.enforceRateLimit({
      operation: "auth.register",
      ip: "127.0.0.1",
      endpoint: "/api/auth/register",
    });

    await expect(
      secondServices.rateLimit.enforceRateLimit({
        operation: "auth.register",
        ip: "127.0.0.1",
        endpoint: "/api/auth/register",
      })
    ).resolves.toBeUndefined();
  });

  it("buildTestSecureAuthConfig produces independent db instances", () => {
    const a = buildTestSecureAuthConfig();
    const b = buildTestSecureAuthConfig();
    expect(a.db).not.toBe(b.db);
  });
});
