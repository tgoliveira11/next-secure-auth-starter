import { describe, it, expect } from "vitest";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

const defaults = {
  appName: "Consumer Demo",
  appSlug: "consumer-demo",
  baseUrl: "http://localhost:3002",
};

describe("buildSecureAuthConfigFromEnv (consumer-demo)", () => {
  it("maps AUTH_SINGLE_ACTIVE_SESSION=true", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_SINGLE_ACTIVE_SESSION: "true",
    });
    expect(config.sessions?.singleActiveSession).toBe(true);
  });

  it("defaults AUTH_SINGLE_ACTIVE_SESSION to false", () => {
    expect(buildSecureAuthConfigFromEnv(defaults, {}).sessions?.singleActiveSession).toBe(
      false
    );
  });

  it("maps password strength position", () => {
    expect(
      buildSecureAuthConfigFromEnv(defaults, {
        AUTH_PASSWORD_STRENGTH_POSITION: "below",
      }).ui?.passwordStrength?.position
    ).toBe("below");
  });

  it("falls back invalid password strength position", () => {
    expect(
      buildSecureAuthConfigFromEnv(defaults, {
        AUTH_PASSWORD_STRENGTH_POSITION: "center",
      }).ui?.passwordStrength?.position
    ).toBe("above");
  });
});
