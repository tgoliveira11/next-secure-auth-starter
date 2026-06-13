import { describe, it, expect } from "vitest";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

const defaults = {
  appName: "Test App",
  appSlug: "test-app",
  baseUrl: "http://localhost:3001",
};

describe("buildSecureAuthConfigFromEnv", () => {
  it("maps AUTH_SINGLE_ACTIVE_SESSION=true", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_SINGLE_ACTIVE_SESSION: "true",
    });
    expect(config.sessions?.singleActiveSession).toBe(true);
  });

  it("defaults AUTH_SINGLE_ACTIVE_SESSION to false when omitted", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {});
    expect(config.sessions?.singleActiveSession).toBe(false);
  });

  it("maps AUTH_PASSWORD_STRENGTH_POSITION=above", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_PASSWORD_STRENGTH_POSITION: "above",
    });
    expect(config.ui?.passwordStrength?.position).toBe("above");
  });

  it("maps AUTH_PASSWORD_STRENGTH_POSITION=below", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_PASSWORD_STRENGTH_POSITION: "below",
    });
    expect(config.ui?.passwordStrength?.position).toBe("below");
  });

  it("falls back invalid AUTH_PASSWORD_STRENGTH_POSITION to above", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_PASSWORD_STRENGTH_POSITION: "left",
    });
    expect(config.ui?.passwordStrength?.position).toBe("above");
  });

  it("maps OAuth when both credentials are present", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_GOOGLE_CLIENT_ID: "gid",
      AUTH_GOOGLE_CLIENT_SECRET: "gsecret",
    });
    expect(config.oauth?.google).toEqual({
      clientId: "gid",
      clientSecret: "gsecret",
    });
  });

  it("uses NODE_ENV for cookie secure when AUTH_COOKIE_SECURE is unset", () => {
    const prod = buildSecureAuthConfigFromEnv(defaults, { NODE_ENV: "production" });
    expect(prod.server?.cookieSecure).toBe(true);

    const dev = buildSecureAuthConfigFromEnv(defaults, { NODE_ENV: "development" });
    expect(dev.server?.cookieSecure).toBe(false);
  });

  it("respects explicit AUTH_COOKIE_SECURE over NODE_ENV", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      NODE_ENV: "production",
      AUTH_COOKIE_SECURE: "false",
    });
    expect(config.server?.cookieSecure).toBe(false);
  });
});
