import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPasskeyLoginService } from "../passkey-login-service";
import { USER_ID } from "@/test/helpers/fixtures";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { ChallengeError, NotFoundError } from "../passkey-service";
import { ValidationError } from "@/modules/account/lib/account-errors";

const mocks = vi.hoisted(() => ({
  consumeValidChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  findByUserId: vi.fn(),
  findByEmail: vi.fn(),
  storeChallenge: vi.fn(),
  updateCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  findById: vi.fn(),
  record: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({ challenge: "login-challenge" }),
  verifyAuthenticationResponse: vi.fn(),
}));

function buildVerifyResponse(challenge = "challenge-1") {
  return {
    id: "cred-id",
    rawId: "cred-id",
    type: "public-key" as const,
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({ challenge, type: "webauthn.get" })
      ).toString("base64url"),
      authenticatorData: "auth-data",
      signature: "sig",
    },
    clientExtensionResults: {},
    authenticatorAttachment: "platform" as const,
  };
}

function buildService() {
  return createPasskeyLoginService({
    config: {
      auth: { requireEmailVerificationBeforeSignIn: false },
    } as never,
    ctx: {
      getWebAuthnRpId: () => "localhost",
      getWebAuthnOrigins: () => ["http://localhost:3000"],
      toPasskeyVerificationErrorMessage: () => "verification failed",
      createOpaqueToken: () => "token",
      hashOpaqueToken: () => "hash",
    } as never,
    repos: {
      passkeyRepository: {
        consumeValidChallenge: mocks.consumeValidChallenge,
        findByCredentialId: mocks.findByCredentialId,
        findByUserId: mocks.findByUserId,
        storeChallenge: mocks.storeChallenge,
        updateCounter: mocks.updateCounter,
        updateLastUsedAt: mocks.updateLastUsedAt,
      },
      userRepository: {
        findById: mocks.findById,
        findByEmail: mocks.findByEmail,
      },
      auditRepository: { record: mocks.record },
      twoFactorRepository: { createLoginChallenge: vi.fn() },
    } as never,
    rateLimit: { enforceRateLimit: mocks.enforceRateLimit } as never,
    authLoginService: { issueLoginToken: vi.fn() } as never,
    authService: { recordLoginSuccess: vi.fn() } as never,
    twoFactorService: { isEnabledForUser: vi.fn().mockResolvedValue(false) } as never,
  });
}

describe("passkey login getLoginOptions branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeChallenge.mockResolvedValue(undefined);
    mocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it("throws when email has no account", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    const service = buildService();

    await expect(service.getLoginOptions({ email: "missing@example.com" })).rejects.toThrow(
      NotFoundError
    );
  });

  it("throws when account has no sign-in passkeys", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "vault-1", signInEnabled: false, transports: null },
    ]);
    const service = buildService();

    await expect(service.getLoginOptions({ email: "user@example.com" })).rejects.toThrow(
      ValidationError
    );
  });

  it("resolves context by credential id", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-1",
      signInEnabled: true,
      transports: ["internal"],
    });
    const service = buildService();

    await service.getLoginOptions({ credentialId: "cred-1" });

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-1", transports: ["internal"] }],
      })
    );
  });

  it("prefers matching credential when userId and credentialId are provided", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "preferred", signInEnabled: true, transports: null },
      { credentialId: "other", signInEnabled: true, transports: null },
    ]);
    const service = buildService();

    await service.getLoginOptions({ userId: USER_ID, credentialId: "preferred" });

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "preferred", transports: undefined }],
      })
    );
  });

  it("returns undefined allowCredentials when user has no sign-in passkeys", async () => {
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([]);
    const service = buildService();

    await service.getLoginOptions({ userId: USER_ID });

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ allowCredentials: undefined })
    );
  });
});

describe("passkey login verifyLogin branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
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
    });
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    } as never);
  });

  it("throws when challenge consumption fails", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    const service = buildService();

    await expect(service.verifyLogin(buildVerifyResponse())).rejects.toThrow(ChallengeError);
  });

  it("throws when credential is unknown", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    const service = buildService();

    await expect(service.verifyLogin(buildVerifyResponse())).rejects.toThrow(NotFoundError);
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_login_failed",
      USER_ID,
      expect.objectContaining({ reason: "unknown_or_sign_in_disabled" })
    );
  });

  it("throws when webauthn verification throws", async () => {
    vi.mocked(verifyAuthenticationResponse).mockRejectedValue(new Error("bad signature"));
    const service = buildService();

    await expect(service.verifyLogin(buildVerifyResponse())).rejects.toThrow(/verification failed/);
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_login_failed",
      USER_ID,
      expect.objectContaining({ reason: "verification_failed" })
    );
  });

  it("throws when verification is not verified", async () => {
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: false,
      authenticationInfo: { newCounter: 0 },
    } as never);
    const service = buildService();

    await expect(service.verifyLogin(buildVerifyResponse())).rejects.toThrow(ChallengeError);
    expect(mocks.record).toHaveBeenCalledWith(
      "passkey_login_failed",
      USER_ID,
      expect.objectContaining({ reason: "not_verified" })
    );
  });

  it("throws when user record disappears after verification", async () => {
    mocks.findById.mockResolvedValue(null);
    const service = buildService();

    await expect(service.verifyLogin(buildVerifyResponse())).rejects.toThrow(NotFoundError);
  });
});
