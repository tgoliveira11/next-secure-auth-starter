import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPasskeyLoginService } from "../passkey-login-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  consumeValidChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  updateCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  findById: vi.fn(),
  isEnabledForUser: vi.fn(),
  createLoginChallenge: vi.fn(),
  issueLoginToken: vi.fn(),
  recordLoginSuccess: vi.fn(),
  record: vi.fn(),
  enforceRateLimit: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
}));

function buildVerifyResponse() {
  return {
    id: "cred-id",
    rawId: "cred-id",
    type: "public-key" as const,
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({ challenge: "challenge-1", type: "webauthn.get" })
      ).toString("base64url"),
      authenticatorData: "auth-data",
      signature: "sig",
    },
    clientExtensionResults: {},
    authenticatorAttachment: "platform" as const,
  };
}

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter: 1 },
  }),
}));

function buildService() {
  return createPasskeyLoginService({
    config: {
      auth: { requireEmailVerificationBeforeSignIn: false },
    } as never,
    ctx: {
      getWebAuthnRpId: () => "localhost",
      getWebAuthnOrigins: () => ["http://localhost:3000"],
      toPasskeyVerificationErrorMessage: () => "verification failed",
      createOpaqueToken: mocks.createOpaqueToken,
      hashOpaqueToken: mocks.hashOpaqueToken,
    } as never,
    repos: {
      passkeyRepository: {
        consumeValidChallenge: mocks.consumeValidChallenge,
        findByCredentialId: mocks.findByCredentialId,
        updateCounter: mocks.updateCounter,
        updateLastUsedAt: mocks.updateLastUsedAt,
      },
      userRepository: {
        findById: mocks.findById,
      },
      twoFactorRepository: {
        createLoginChallenge: mocks.createLoginChallenge,
      },
      auditRepository: {
        record: mocks.record,
      },
    } as never,
    rateLimit: {
      enforceRateLimit: mocks.enforceRateLimit,
    } as never,
    authLoginService: {
      issueLoginToken: mocks.issueLoginToken,
    } as never,
    authService: {
      recordLoginSuccess: mocks.recordLoginSuccess,
    } as never,
    twoFactorService: {
      isEnabledForUser: mocks.isEnabledForUser,
    } as never,
  });
}

describe("passkey login service verifyLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "challenge-1", userId: USER_ID });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      emailVerifiedAt: new Date(),
      authProvider: "credentials",
    });
    mocks.createOpaqueToken.mockReturnValue("challenge-token-1234567890");
    mocks.hashOpaqueToken.mockReturnValue("hash");
    mocks.issueLoginToken.mockResolvedValue("login-token");
    mocks.createLoginChallenge.mockResolvedValue({ id: "challenge-row" });
  });

  it("completes login when two-factor is disabled", async () => {
    mocks.isEnabledForUser.mockResolvedValue(false);
    const service = buildService();

    const result = await service.verifyLogin(buildVerifyResponse());

    expect(result).toEqual({
      requiresTwoFactor: false,
      loginToken: "login-token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    expect(mocks.issueLoginToken).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.createLoginChallenge).not.toHaveBeenCalled();
  });

  it("requires TOTP when two-factor is enabled", async () => {
    mocks.isEnabledForUser.mockResolvedValue(true);
    const service = buildService();

    const result = await service.verifyLogin(buildVerifyResponse());

    expect(result).toEqual({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    expect(mocks.createLoginChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        authProvider: "passkey",
      })
    );
    expect(mocks.issueLoginToken).not.toHaveBeenCalled();
    expect(mocks.recordLoginSuccess).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith("passkey_login_success", USER_ID);
    expect(mocks.record).toHaveBeenCalledWith(
      "two_factor_login_required",
      USER_ID,
      expect.objectContaining({ provider: "passkey" })
    );
  });
});
