import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { createAuthLoginService, InvalidCredentialsError } from "../auth-login-service";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  upgradePasswordHashIfCurrent: vi.fn(),
  createLoginToken: vi.fn(),
  isEnabledForUser: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  passwordHashNeedsRehash: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  verifyPassword: mocks.verifyPassword,
  hashPassword: mocks.hashPassword,
  passwordHashNeedsRehash: mocks.passwordHashNeedsRehash,
}));

vi.mock("@/modules/security/logger/index", () => ({
  safeLogger: { warn: mocks.warn },
}));

const legacyUser = {
  id: "user-1",
  email: "user@example.com",
  authProvider: "credentials",
  passwordHash: "$2b$12$legacy",
  status: "active",
  emailVerifiedAt: new Date(),
};

const upgradedUser = {
  ...legacyUser,
  passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$upgraded",
};

function buildService() {
  return createAuthLoginService({
    config: buildTestSecureAuthConfig(),
    ctx: {
      createOpaqueToken: () => "login-token",
      hashOpaqueToken: () => "login-token-hash",
    } as never,
    repos: {
      userRepository: {
        findByEmail: mocks.findByEmail,
        findById: mocks.findById,
        upgradePasswordHashIfCurrent: mocks.upgradePasswordHashIfCurrent,
      },
      twoFactorRepository: {
        createLoginToken: mocks.createLoginToken,
      },
    } as never,
    rateLimit: { enforceRateLimit: vi.fn() } as never,
    authService: {
      assertLoginAllowed: vi.fn(),
      recordLoginFailure: vi.fn(),
      recordLoginSuccess: vi.fn(),
    } as never,
    twoFactorService: {
      isEnabledForUser: mocks.isEnabledForUser,
    } as never,
  });
}

describe("credentials login password hash migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue(legacyUser);
    mocks.findById.mockResolvedValue(upgradedUser);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue(upgradedUser.passwordHash);
    mocks.passwordHashNeedsRehash.mockReturnValue(true);
    mocks.upgradePasswordHashIfCurrent.mockResolvedValue(upgradedUser);
    mocks.isEnabledForUser.mockResolvedValue(false);
    mocks.createLoginToken.mockResolvedValue({ id: "token-row" });
  });

  it("transparently upgrades a verified legacy hash with compare-and-set", async () => {
    const result = await buildService().startCredentialsLogin(
      "USER@example.com ",
      "correct-password"
    );

    expect(result).toEqual({ requiresTwoFactor: false, loginToken: "login-token" });
    expect(mocks.hashPassword).toHaveBeenCalledWith("correct-password");
    expect(mocks.upgradePasswordHashIfCurrent).toHaveBeenCalledWith(
      legacyUser.id,
      legacyUser.passwordHash,
      upgradedUser.passwordHash
    );
    expect(mocks.findById).not.toHaveBeenCalled();
  });

  it("does not rewrite a hash that already meets the current policy", async () => {
    mocks.passwordHashNeedsRehash.mockReturnValue(false);

    await buildService().startCredentialsLogin(legacyUser.email, "correct-password");

    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.upgradePasswordHashIfCurrent).not.toHaveBeenCalled();
  });

  it("defers migration without blocking login when hashing fails", async () => {
    mocks.hashPassword.mockRejectedValue(new Error("native hashing unavailable"));

    await expect(
      buildService().startCredentialsLogin(legacyUser.email, "correct-password")
    ).resolves.toMatchObject({ requiresTwoFactor: false });

    expect(mocks.upgradePasswordHashIfCurrent).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith(
      "Password hash upgrade deferred",
      expect.objectContaining({ reason: "Error" })
    );
  });

  it("defers migration without refetching when the write itself fails", async () => {
    mocks.upgradePasswordHashIfCurrent.mockRejectedValue(new Error("database unavailable"));

    await expect(
      buildService().startCredentialsLogin(legacyUser.email, "correct-password")
    ).resolves.toMatchObject({ requiresTwoFactor: false });

    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith(
      "Password hash upgrade deferred after write failure",
      expect.objectContaining({ reason: "Error" })
    );
  });

  it("rejects a stale credential when compare-and-set loses to a password change", async () => {
    mocks.upgradePasswordHashIfCurrent.mockResolvedValue(null);
    mocks.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      buildService().startCredentialsLogin(legacyUser.email, "stale-password")
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(mocks.findById).toHaveBeenCalledWith(legacyUser.id);
    expect(mocks.createLoginToken).not.toHaveBeenCalled();
  });

  it("continues when compare-and-set loses to an equivalent concurrent rehash", async () => {
    mocks.upgradePasswordHashIfCurrent.mockResolvedValue(null);

    await expect(
      buildService().startCredentialsLogin(legacyUser.email, "correct-password")
    ).resolves.toMatchObject({ requiresTwoFactor: false });

    expect(mocks.findById).toHaveBeenCalledWith(legacyUser.id);
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(2);
  });
});
