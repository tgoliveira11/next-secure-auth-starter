import { vi, beforeEach } from "vitest";
import { initSecureAuthRuntime } from "../core/init-runtime.js";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "../server/policies/rate-limit/in-memory-adapter.js";
import { setRateLimitAdapterForTests } from "../server/policies/rate-limit/index.js";
import { createMockDb } from "./helpers/mock-db.js";
import { createMockEmailProvider } from "./helpers/mock-email-provider.js";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  resetAllInMemoryRateLimits();
  setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
});

initSecureAuthRuntime({
  db: createMockDb(),
  app: {
    name: "Test App",
    slug: "test-app",
    baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
  },
  auth: {
    afterLoginPath: "/dashboard",
    afterLogoutPath: "/login",
    requireEmailVerificationBeforeSignIn: false,
    nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only",
    twoFactorEncryptionKey:
      process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key",
  },
  accountPolicy: {
    sendVerificationOnRegister: process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER !== "false",
    requireEmailVerificationBeforeSignIn:
      process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN === "true",
  },
  email: {
    from: "Test <noreply@test>",
    provider: createMockEmailProvider(),
  },
  webauthn: {
    rpId: "localhost",
    rpName: "Test App",
    origin: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
  },
});

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key";
