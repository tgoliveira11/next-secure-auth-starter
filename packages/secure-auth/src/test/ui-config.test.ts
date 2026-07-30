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
    expect(ui.paths.afterLogout).toBe("/");
    expect(ui.messages.loginTitle).toBe("Sign in now");
    expect(ui.cssVariables).toEqual({ "--primary": "#336699" });
    expect(ui.passwordPolicy.enforcement).toBe("warn");
    expect(ui.passwordStrength.position).toBe("above");
    expect(ui.sessionPolicy).toEqual({
      singleActiveSession: false,
      revocationPollIntervalSeconds: 0,
    });
    expect(ui.auth).toEqual({
      redirectAuthenticatedFromGuestPages: true,
      authenticatedRedirectPath: "/dashboard",
    });
    expect(ui.oauthProviderIds).toEqual([]);
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

  it("defaults afterLogout to the app home when the config omits it", () => {
    const config = buildTestSecureAuthConfig();
    delete (config.auth as { afterLogoutPath?: string }).afterLogoutPath;

    expect(buildPublicUIConfig(config).paths.afterLogout).toBe("/");
  });

  it("defaults the login layout to a single step and honors ui.login.twoStep", () => {
    expect(buildPublicUIConfig(buildTestSecureAuthConfig()).login).toEqual({ twoStep: false });

    const twoStep = buildPublicUIConfig(
      buildTestSecureAuthConfig({ ui: { login: { twoStep: true } } })
    );
    expect(twoStep.login).toEqual({ twoStep: true });
  });

  it("maps custom afterLogoutPath from createSecureAuth auth config", () => {
    const ui = buildPublicUIConfig(
      buildTestSecureAuthConfig({
        auth: {
          ...buildTestSecureAuthConfig().auth,
          afterLogoutPath: "/goodbye",
        },
      })
    );

    expect(ui.paths.afterLogout).toBe("/goodbye");
  });

  it("does not expose server-only config such as secrets or email provider", () => {
    const config = buildTestSecureAuthConfig({
      auth: {
        nextAuthSecret: "super-secret",
        twoFactorEncryptionKey: "encryption-key",
        afterLoginPath: "/dashboard",
        afterLogoutPath: "/",
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
    expect(ui.oauthProviderIds).toEqual(["google"]);
  });

  it("advertises only OAuth providers that NextAuth can install", () => {
    const ui = buildPublicUIConfig(
      buildTestSecureAuthConfig({
        oauth: {
          google: { clientId: "google-id", clientSecret: "google-secret" },
          apple: { clientId: "apple-id", clientSecret: "apple-secret" },
          github: { clientId: "github-id", clientSecret: "github-secret" },
          microsoft: {
            clientId: "11111111-1111-4111-8111-111111111111",
            clientSecret: "microsoft-secret",
            tenantId: "organizations",
          },
        },
      })
    );

    expect(ui.oauthProviderIds).toEqual(["google", "apple", "github", "azure-ad"]);
  });

  it("does not advertise incomplete or invalid OAuth provider blocks", () => {
    const ui = buildPublicUIConfig(
      buildTestSecureAuthConfig({
        oauth: {
          github: { clientId: "github-id", clientSecret: "" },
          microsoft: {
            clientId: "not-a-guid",
            clientSecret: "microsoft-secret",
          },
        },
      })
    );

    expect(ui.oauthProviderIds).toEqual([]);
  });
});
