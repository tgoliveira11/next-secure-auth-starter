import { describe, it, expect } from "vitest";
import { buildPublicUIConfig } from "../core/ui-config.js";
import { buildTestSecureAuthConfig } from "./helpers/create-test-secure-auth.js";

describe("buildPublicUIConfig", () => {
  it("maps createSecureAuth ui config to serializable client defaults", () => {
    const config = buildTestSecureAuthConfig({
      ui: {
        brand: { name: "Branded App" },
        paths: { login: "/sign-in", register: "/join" },
        messages: { loginTitle: "Sign in now" },
        cssVariables: { "--primary": "#336699" },
      },
    });

    const ui = buildPublicUIConfig(config);

    expect(ui.appSlug).toBe("test-app");
    expect(ui.appName).toBe("Branded App");
    expect(ui.paths.login).toBe("/sign-in");
    expect(ui.paths.register).toBe("/join");
    expect(ui.paths.afterLogin).toBe("/dashboard");
    expect(ui.messages.loginTitle).toBe("Sign in now");
    expect(ui.cssVariables).toEqual({ "--primary": "#336699" });
    expect(ui.passwordPolicy.enforcement).toBe("warn");
    expect(ui.passwordStrength.position).toBe("above");
    expect(ui.sessionPolicy).toEqual({
      singleActiveSession: false,
      revocationPollIntervalSeconds: 0,
    });
  });

  it("enables session revocation polling when singleActiveSession is true", () => {
    const config = buildTestSecureAuthConfig({
      sessions: { singleActiveSession: true },
    });

    const ui = buildPublicUIConfig(config);
    expect(ui.sessionPolicy.singleActiveSession).toBe(true);
    expect(ui.sessionPolicy.revocationPollIntervalSeconds).toBe(10);
  });

  it("maps passwordStrength.position from createSecureAuth ui config", () => {
    const config = buildTestSecureAuthConfig({
      ui: {
        passwordStrength: { position: "below" },
      },
    });

    const ui = buildPublicUIConfig(config);
    expect(ui.passwordStrength.position).toBe("below");
  });

  it("resolves partial passwordPolicy overrides with package defaults", () => {
    const config = buildTestSecureAuthConfig({
      passwordPolicy: { minLength: 5 },
    });

    const ui = buildPublicUIConfig(config);

    expect(ui.passwordPolicy.minLength).toBe(5);
    expect(ui.passwordPolicy.enforcement).toBe("warn");
    expect(ui.passwordPolicy.blockCommonPasswords).toBe(true);
  });

  it("defaults passwordPolicy.minLength to 12 when omitted", () => {
    const ui = buildPublicUIConfig(buildTestSecureAuthConfig());
    expect(ui.passwordPolicy.minLength).toBe(12);
  });

  it("exposes public captcha config without secret key", () => {
    const ui = buildPublicUIConfig(
      buildTestSecureAuthConfig({
        captcha: {
          enabled: true,
          siteKey: "site-key",
          secretKey: "secret-key",
          pages: { register: true, login: true },
        },
      })
    );

    expect(ui.captcha).toEqual({
      provider: "turnstile",
      siteKey: "site-key",
      pages: { register: true, login: true },
    });
    expect(JSON.stringify(ui)).not.toContain("secret-key");
  });

  it("does not expose server-only config such as secrets or email provider", () => {
    const config = buildTestSecureAuthConfig({
      auth: {
        nextAuthSecret: "super-secret",
        twoFactorEncryptionKey: "encryption-key",
        afterLoginPath: "/dashboard",
        afterLogoutPath: "/login",
        requireEmailVerificationBeforeSignIn: false,
      },
      oauth: {
        google: { clientId: "google-id", clientSecret: "google-secret" },
      },
    });

    const ui = buildPublicUIConfig(config);
    const serialized = JSON.stringify(ui);

    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("encryption-key");
    expect(serialized).not.toContain("google-secret");
    expect(serialized).not.toContain("google-id");
    expect(ui).not.toHaveProperty("db");
    expect(ui).not.toHaveProperty("email");
    expect(ui).not.toHaveProperty("oauth");
  });
});
