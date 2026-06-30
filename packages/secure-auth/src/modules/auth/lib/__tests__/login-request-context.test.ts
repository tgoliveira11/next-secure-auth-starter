import { describe, it, expect } from "vitest";
import { createTestSecureAuth } from "@/test/helpers/create-test-secure-auth";
import { runWithLoginRequestContext, getLoginRequestIp } from "../login-request-context";

describe("login request context", () => {
  it("stores and reads request IP within async context", () => {
    expect(getLoginRequestIp()).toBeUndefined();
    runWithLoginRequestContext("203.0.113.10", () => {
      expect(getLoginRequestIp()).toBe("203.0.113.10");
    });
    expect(getLoginRequestIp()).toBeUndefined();
  });
});

describe("createSecureAuth surface", () => {
  it("exposes config helpers and lazy services accessor", async () => {
    const secureAuth = createTestSecureAuth();
    expect(secureAuth.ui).toEqual(secureAuth.getPublicUIConfig());
    expect(secureAuth.passwordPolicy).toBeDefined();
    expect(() => secureAuth.services).toThrow(/getServices/);
    await expect(secureAuth.getServices()).resolves.toBeDefined();
  });
});
