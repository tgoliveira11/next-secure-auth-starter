import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { createSecureAuthContext } from "../create-secure-auth-context";

describe("createSecureAuthContext", () => {
  it("wires config-derived helpers", () => {
    const config = buildTestSecureAuthConfig();
    const ctx = createSecureAuthContext({ config });

    expect(ctx.getAppSlug()).toBe(config.app.slug);
    expect(ctx.getAppName()).toBe(config.app.name);
    expect(ctx.requireNextAuthSecret()).toBe(config.auth.nextAuthSecret);
    expect(ctx.getPrimaryWebAuthnOrigin()).toContain("http");
    expect(ctx.getWebAuthnOrigins().length).toBeGreaterThan(0);
    expect(ctx.getLoginPendingTokenCookieName()).toContain(config.app.slug);
    expect(ctx.getTwoFactorLoginChallengeCookieName()).toContain(config.app.slug);
    expect(ctx.getSessionMaxAgeMs()).toBeGreaterThan(0);
    expect(ctx.getAccountPolicyConfig()).toBeDefined();
    expect(ctx.getPasswordPolicyConfig()).toBeDefined();

    const token = ctx.createOpaqueToken();
    expect(token.length).toBeGreaterThan(16);
    expect(ctx.hashOpaqueToken(token)).not.toBe(token);
    expect(ctx.hashEmailForScope("user@example.com")).not.toBe("user@example.com");
    expect(ctx.hashIp("203.0.113.10")).not.toBe("203.0.113.10");
    expect(ctx.maskIp("203.0.113.10")).toContain("xxx");
    expect(ctx.hashUserAgent("Mozilla/5.0")).not.toBe("Mozilla/5.0");

    const encrypted = ctx.encryptTwoFactorSecret("secret");
    expect(ctx.decryptTwoFactorSecret(encrypted)).toBe("secret");
    expect(ctx.hashBackupCode("12345678")).not.toBe("12345678");
    expect(ctx.getBackupCodeHashCandidates("12345678")).toHaveLength(2);
    expect(ctx.validatePasswordForSubmission("ValidPassword123!")).toMatchObject({ valid: true });
    expect(ctx.verificationEmailContent("token").subject).toContain(config.app.name);
    expect(ctx.passwordResetEmailContent("token").subject).toContain(config.app.name);
    expect(ctx.toPasskeyVerificationErrorMessage(new Error("origin mismatch"))).toContain("Passkey");
  });

  it("wires strict WebAuthn origins into the verification context", () => {
    const config = buildTestSecureAuthConfig({
      app: { name: "Test App", slug: "test-app", baseUrl: "https://example.com" },
      webauthn: {
        rpId: "example.com",
        rpName: "Test App",
        origin: "https://www.example.com",
        originAliasPolicy: "none",
      },
    });

    const ctx = createSecureAuthContext({ config });

    expect(ctx.getWebAuthnOrigins()).toEqual(["https://www.example.com"]);
    expect(ctx.toPasskeyVerificationErrorMessage(new Error("origin mismatch"))).toContain(
      "must use https://www.example.com"
    );
  });
});
