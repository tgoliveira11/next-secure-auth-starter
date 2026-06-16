import { createSecureAuth } from "../../next/create-secure-auth.js";
import type { SecureAuthConfig } from "../../core/types.js";
import { createMockDb } from "./mock-db.js";
import { createMockEmailProvider } from "./mock-email-provider.js";

const baseTestConfig = {
  app: {
    name: "Test App",
    slug: "test-app",
    baseUrl: "http://localhost:3001",
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: "test-secret-for-vitest-only",
    twoFactorEncryptionKey: "test-two-factor-secret-encryption-key",
  },
  accountPolicy: {
    sendVerificationOnRegister: true,
    requireEmailVerificationBeforeSignIn: false,
  },
  email: {
    from: "Test <noreply@test>",
    provider: createMockEmailProvider(),
  },
  webauthn: {
    rpId: "localhost",
    rpName: "Test App",
    origin: "http://localhost:3001",
  },
} satisfies Omit<SecureAuthConfig, "db">;

/** Base config object for `createTestSecureAuth` in individual tests. */
export function buildTestSecureAuthConfig(
  overrides: Partial<SecureAuthConfig> = {}
): SecureAuthConfig {
  return {
    db: createMockDb(),
    ...baseTestConfig,
    ...overrides,
    app: { ...baseTestConfig.app, ...overrides.app },
    auth: { ...baseTestConfig.auth, ...overrides.auth },
    accountPolicy: { ...baseTestConfig.accountPolicy, ...overrides.accountPolicy },
    passwordPolicy: { ...overrides.passwordPolicy },
    email: { ...baseTestConfig.email, ...overrides.email },
    webauthn: { ...baseTestConfig.webauthn, ...overrides.webauthn },
  };
}

/** Create a package runtime for route tests with explicit injected config. */
export function createTestSecureAuth(overrides: Partial<SecureAuthConfig> = {}) {
  return createSecureAuth(buildTestSecureAuthConfig(overrides));
}