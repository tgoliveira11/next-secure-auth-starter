import { vi, expect, beforeAll } from "vitest";
import { toHaveNoViolations } from "jest-axe";
import { initSecureAuthRuntime } from "../../../../packages/secure-auth/src/core/init-runtime";
import { db } from "@/lib/db";

expect.extend(toHaveNoViolations);

vi.mock("server-only", () => ({}));

beforeAll(() => {
  initSecureAuthRuntime({
    db,
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
      provider: { send: async () => {} },
    },
    webauthn: {
      rpId: "localhost",
      rpName: "Test App",
      origin: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
    },
  });
});

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/next_secure_auth_starter";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key";
