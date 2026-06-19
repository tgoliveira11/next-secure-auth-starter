import { describe, it, expect } from "vitest";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

const defaults = {
  appName: "Test App",
  appSlug: "test-app",
  baseUrl: "http://localhost:3003",
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

  it("maps GitHub OAuth when both credentials are present", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_GITHUB_CLIENT_ID: "gh-id",
      AUTH_GITHUB_CLIENT_SECRET: "gh-secret",
    });
    expect(config.oauth?.github).toEqual({
      clientId: "gh-id",
      clientSecret: "gh-secret",
    });
  });

  it("omits GitHub OAuth when credentials are incomplete", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_GITHUB_CLIENT_ID: "gh-id",
    });
    expect(config.oauth?.github).toBeUndefined();
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

  it("maps AUTH_PASSWORD_MIN_LENGTH=5 to passwordPolicy.minLength", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_PASSWORD_MIN_LENGTH: "5",
    });
    expect(config.passwordPolicy?.minLength).toBe(5);
  });

  it("defaults AUTH_PASSWORD_MIN_LENGTH to 12 when omitted", () => {
    expect(buildSecureAuthConfigFromEnv(defaults, {}).passwordPolicy?.minLength).toBe(12);
  });

  it("maps Microsoft OAuth and defaults tenant id to common", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_MICROSOFT_CLIENT_ID: "ms-id",
      AUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
    });
    expect(config.oauth?.microsoft).toEqual({
      clientId: "ms-id",
      clientSecret: "ms-secret",
      tenantId: "common",
    });
  });

  it("maps explicit Microsoft tenant id", () => {
    const config = buildSecureAuthConfigFromEnv(defaults, {
      AUTH_MICROSOFT_CLIENT_ID: "ms-id",
      AUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
      AUTH_MICROSOFT_TENANT_ID: "tenant-guid",
    });
    expect(config.oauth?.microsoft?.tenantId).toBe("tenant-guid");
  });
});
