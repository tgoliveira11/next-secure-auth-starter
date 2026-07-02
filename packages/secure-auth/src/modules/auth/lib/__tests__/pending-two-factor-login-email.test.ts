import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecureAuthServices } from "@/core/types";
import {
  getPendingTwoFactorLoginEmail,
  getPendingTwoFactorLoginState,
} from "@/modules/auth/lib/pending-two-factor-login-email";

const mocks = vi.hoisted(() => ({
  cookiesGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookiesGet,
  })),
}));

function buildServices(overrides: {
  peekLoginChallenge?: ReturnType<typeof vi.fn>;
  findById?: ReturnType<typeof vi.fn>;
  cookieName?: string;
} = {}): SecureAuthServices {
  const cookieName = overrides.cookieName ?? "two-factor-login-challenge";
  return {
    ctx: {
      getTwoFactorLoginChallengeCookieName: () => cookieName,
      hashOpaqueToken: (token: string) => `hash:${token}`,
    },
    repos: {
      twoFactorRepository: {
        peekLoginChallenge: overrides.peekLoginChallenge ?? vi.fn(),
      },
      userRepository: {
        findById: overrides.findById ?? vi.fn(),
      },
    },
  } as unknown as SecureAuthServices;
}

describe("pending two-factor login email helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not pending when the challenge cookie is missing", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const services = buildServices();

    await expect(getPendingTwoFactorLoginState(services)).resolves.toEqual({ pending: false });
    await expect(getPendingTwoFactorLoginEmail(services)).resolves.toBeUndefined();
  });

  it("returns not pending when the challenge token is too short", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "short" });
    const services = buildServices();

    await expect(getPendingTwoFactorLoginState(services)).resolves.toEqual({ pending: false });
  });

  it("returns pending with email when the challenge resolves to a user", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "challenge-token-1234567890" });
    const peekLoginChallenge = vi.fn().mockResolvedValue({ userId: "user-1" });
    const findById = vi.fn().mockResolvedValue({ email: "user@example.com" });
    const services = buildServices({ peekLoginChallenge, findById });

    await expect(getPendingTwoFactorLoginState(services)).resolves.toEqual({
      pending: true,
      email: "user@example.com",
    });
    await expect(getPendingTwoFactorLoginEmail(services)).resolves.toBe("user@example.com");
    expect(peekLoginChallenge).toHaveBeenCalledWith("hash:challenge-token-1234567890");
    expect(findById).toHaveBeenCalledWith("user-1");
  });

  it("returns pending without email when the user record is missing", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "challenge-token-1234567890" });
    const peekLoginChallenge = vi.fn().mockResolvedValue({ userId: "user-1" });
    const findById = vi.fn().mockResolvedValue(null);
    const services = buildServices({ peekLoginChallenge, findById });

    await expect(getPendingTwoFactorLoginState(services)).resolves.toEqual({ pending: true });
    await expect(getPendingTwoFactorLoginEmail(services)).resolves.toBeUndefined();
  });

  it("returns not pending when the challenge expired", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "challenge-token-1234567890" });
    const peekLoginChallenge = vi.fn().mockResolvedValue(null);
    const services = buildServices({ peekLoginChallenge });

    await expect(getPendingTwoFactorLoginState(services)).resolves.toEqual({ pending: false });
  });
});
