import { vi, expect, beforeEach } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("server-only", () => ({}));

/**
 * Node 22+ may expose a non-functional experimental `localStorage` global
 * (`--localstorage-file` without a valid path). Remove it so happy-dom can
 * provide a working Storage implementation in browser-oriented tests.
 */
function stripBrokenNodeLocalStorage(): void {
  const storage = globalThis.localStorage;
  if (storage && typeof storage.getItem !== "function") {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
}

stripBrokenNodeLocalStorage();

beforeEach(() => {
  stripBrokenNodeLocalStorage();
});

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/next_secure_auth_starter";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3003";
process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key";
