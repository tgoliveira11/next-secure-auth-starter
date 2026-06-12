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
