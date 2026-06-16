import { describe, it, expect } from "vitest";
import { createTestSecureAuth } from "@/test/helpers/create-test-secure-auth";

describe("createSecureAuth password policy", () => {
  it("exposes resolved passwordPolicy on the secureAuth instance", () => {
    const secureAuth = createTestSecureAuth({
      passwordPolicy: { minLength: 5 },
    });

    expect(secureAuth.passwordPolicy.minLength).toBe(5);
    expect(secureAuth.passwordPolicy.enforcement).toBe("warn");
  });

  it("maps resolved passwordPolicy into uiConfig", () => {
    const secureAuth = createTestSecureAuth({
      passwordPolicy: { minLength: 5 },
    });

    expect(secureAuth.uiConfig.passwordPolicy.minLength).toBe(5);
  });

  it("defaults uiConfig.passwordPolicy.minLength to 12 when omitted", () => {
    const secureAuth = createTestSecureAuth();
    expect(secureAuth.uiConfig.passwordPolicy.minLength).toBe(12);
    expect(secureAuth.passwordPolicy.minLength).toBe(12);
  });
});
