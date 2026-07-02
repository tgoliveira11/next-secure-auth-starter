import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  getAppName,
  getAppSlug,
  requireNextAuthSecret,
  requireTwoFactorEncryptionKey,
  resolveAccountPolicyConfig,
  resolveAuthTraceEnabled,
  resolveAuthTraceExposeRoute,
  resolveCookieSecure,
  resolvePasswordPolicyConfig,
  resolveRateLimitStore,
  assertProductionRateLimitConfig,
  resolveRevocationPollIntervalSeconds,
  resolveSameOriginProtectionConfig,
  resolveSessionLastUsedUpdateIntervalMs,
  resolveSessionMaxAgeMs,
  resolveSingleActiveSessionEnabled,
} from "../config-accessors";

describe("config accessors", () => {
  it("reads app slug and name", () => {
    const config = buildTestSecureAuthConfig();
    expect(getAppSlug(config)).toBe("test-app");
    expect(getAppName(config)).toBe("Test App");
  });

  it("requires nextAuth secret and two-factor encryption key", () => {
    const config = buildTestSecureAuthConfig();
    expect(requireNextAuthSecret(config)).toBe(config.auth.nextAuthSecret);
    expect(requireTwoFactorEncryptionKey(config)).toBe(config.auth.twoFactorEncryptionKey);
  });

  it("throws when required secrets are missing", () => {
    const config = buildTestSecureAuthConfig({
      auth: { nextAuthSecret: "", twoFactorEncryptionKey: "" } as never,
    });
    expect(() => requireNextAuthSecret(config)).toThrow(/nextAuthSecret/);
    expect(() => requireTwoFactorEncryptionKey(config)).toThrow(/twoFactorEncryptionKey/);
  });

  it("merges password and account policy defaults", () => {
    const config = buildTestSecureAuthConfig({
      passwordPolicy: { minLength: 14 },
      accountPolicy: {
        sendVerificationOnRegister: false,
        requireEmailVerificationBeforeSignIn: true,
      },
    });

    expect(resolvePasswordPolicyConfig(config).minLength).toBe(14);
    expect(resolveAccountPolicyConfig(config)).toMatchObject({
      sendVerificationOnRegister: false,
      requireEmailVerificationBeforeSignIn: true,
    });
  });

  it("resolves same-origin protection defaults and overrides", () => {
    const defaults = resolveSameOriginProtectionConfig(buildTestSecureAuthConfig());
    expect(defaults).toEqual({ enabled: true, allowedOrigins: [] });

    const custom = resolveSameOriginProtectionConfig(
      buildTestSecureAuthConfig({
        security: { sameOriginProtection: { enabled: false, allowedOrigins: ["https://app.test"] } },
      })
    );
    expect(custom).toEqual({ enabled: false, allowedOrigins: ["https://app.test"] });
  });

  it("resolves auth trace flags", () => {
    expect(resolveAuthTraceEnabled(buildTestSecureAuthConfig())).toBe(false);
    expect(resolveAuthTraceExposeRoute(buildTestSecureAuthConfig())).toBe(false);

    const traced = buildTestSecureAuthConfig({
      debug: { authTrace: true, exposeTraceRoute: true },
    });
    expect(resolveAuthTraceEnabled(traced)).toBe(true);
    expect(resolveAuthTraceExposeRoute(traced)).toBe(true);
  });

  it("falls back for invalid session timing values", () => {
    const config = buildTestSecureAuthConfig({
      sessions: {
        maxAgeSeconds: Number.NaN,
        lastUsedUpdateIntervalSeconds: -1,
      },
    });

    expect(resolveSessionMaxAgeMs(config)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(resolveSessionLastUsedUpdateIntervalMs(config)).toBe(300_000);
  });

  it("uses configured session timing when valid", () => {
    const config = buildTestSecureAuthConfig({
      sessions: {
        maxAgeSeconds: 3600,
        lastUsedUpdateIntervalSeconds: 120,
      },
    });

    expect(resolveSessionMaxAgeMs(config)).toBe(3_600_000);
    expect(resolveSessionLastUsedUpdateIntervalMs(config)).toBe(120_000);
  });

  it("resolves single active session and revocation poll interval", () => {
    expect(resolveSingleActiveSessionEnabled(buildTestSecureAuthConfig())).toBe(false);
    expect(resolveRevocationPollIntervalSeconds(buildTestSecureAuthConfig())).toBe(0);

    const enabled = buildTestSecureAuthConfig({
      sessions: { singleActiveSession: true, revocationPollIntervalSeconds: 30 },
    });
    expect(resolveSingleActiveSessionEnabled(enabled)).toBe(true);
    expect(resolveRevocationPollIntervalSeconds(enabled)).toBe(30);

    const clamped = buildTestSecureAuthConfig({
      sessions: { singleActiveSession: true, revocationPollIntervalSeconds: 999 },
    });
    expect(resolveRevocationPollIntervalSeconds(clamped)).toBe(300);

    const tooLow = buildTestSecureAuthConfig({
      sessions: { singleActiveSession: true, revocationPollIntervalSeconds: 2 },
    });
    expect(resolveRevocationPollIntervalSeconds(tooLow)).toBe(10);
  });

  it("resolves cookie secure and rate limit store", () => {
    expect(resolveCookieSecure(buildTestSecureAuthConfig())).toBe(false);
    expect(resolveRateLimitStore(buildTestSecureAuthConfig())).toBe("memory");

    const custom = buildTestSecureAuthConfig({
      server: { cookieSecure: true },
      rateLimit: { store: "postgres" },
    });
    expect(resolveCookieSecure(custom)).toBe(true);
    expect(resolveRateLimitStore(custom)).toBe("postgres");
  });

  it("rejects in-memory rate limiting in production", () => {
    expect(() =>
      assertProductionRateLimitConfig(
        buildTestSecureAuthConfig({ server: { environment: "production" } })
      )
    ).toThrow(/postgres/);

    expect(() =>
      assertProductionRateLimitConfig(
        buildTestSecureAuthConfig({
          server: { environment: "production" },
          rateLimit: { store: "postgres" },
        })
      )
    ).not.toThrow();
  });
});
