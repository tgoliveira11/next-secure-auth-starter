import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyLoginService } from "@/server/services/passkey-login-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { ValidationError } from "@/server/services/account-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  findByCredentialId: vi.fn(),
  updateCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  issueLoginToken: vi.fn(),
  recordLoginSuccess: vi.fn(),
  record: vi.fn(),
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findValidLoginToken: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    storeChallenge: mocks.storeChallenge,
    consumeValidChallenge: mocks.consumeValidChallenge,
    findByCredentialId: mocks.findByCredentialId,
    updateCounter: mocks.updateCounter,
    updateLastUsedAt: mocks.updateLastUsedAt,
    findByUserId: mocks.findByUserId,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findByEmail: mocks.findByEmail, findById: mocks.findById },
}));

vi.mock("@/server/services/auth-login-service", () => ({
  authLoginService: { issueLoginToken: mocks.issueLoginToken },
}));

vi.mock("@/server/services/auth-service", () => ({
  authService: { recordLoginSuccess: mocks.recordLoginSuccess },
}));

vi.mock("@/server/repositories/two-factor-repository", () => ({
  twoFactorRepository: { findValidLoginToken: mocks.findValidLoginToken },
}));

function authResponse(challenge: string, id = "cred-id") {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.get", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id,
    rawId: id,
    type: "public-key",
    response: {
      clientDataJSON,
      authenticatorData: "aa",
      signature: "sig",
    },
    clientExtensionResults: {},
  };
}

describe("passkey login service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByUserId.mockResolvedValue([]);
  });

  it("stores login challenge for discoverable authentication", async () => {
    const result = await passkeyLoginService.getLoginOptions();
    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.storeChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login", userId: undefined })
    );
  });

  it("falls back to all sign-in credentials when preferred credential is stale", async () => {
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-a", signInEnabled: true, transports: ["internal"] },
      { credentialId: "cred-b", signInEnabled: true, transports: null },
    ]);

    await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "missing-cred",
    });

    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [
          { id: "cred-a", transports: ["internal"] },
          { id: "cred-b", transports: undefined },
        ],
      })
    );
  });

  it("prefers credentialId lookup over userId when both are provided", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      transports: null,
    });

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "cred-id",
    });

    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.findByCredentialId).toHaveBeenCalledWith("cred-id");
    expect(mocks.findById).not.toHaveBeenCalled();
  });

  it("falls back to userId when cached credentialId is stale", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "new-cred",
        signInEnabled: true,
        transports: null,
      },
    ]);

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "stale-cred",
    });

    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.findById).toHaveBeenCalledWith(USER_ID);
  });

  it("uses allowCredentials when cached credentialId is provided", async () => {
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      transports: null,
    });

    const result = await passkeyLoginService.getLoginOptions({
      credentialId: "cred-id",
    });

    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-id", transports: undefined }],
      })
    );
  });

  it("keeps discoverable login when cached credentialId is unknown", async () => {
    mocks.findByCredentialId.mockResolvedValue(null);
    const result = await passkeyLoginService.getLoginOptions({ credentialId: "missing" });
    expect(result.options.challenge).toBe("login-challenge");
  });

  it("builds allowCredentials from cached userId", async () => {
    mocks.findById.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "cred-id",
        signInEnabled: true,
        transports: null,
      },
    ]);

    const result = await passkeyLoginService.getLoginOptions({
      userId: USER_ID,
      credentialId: "cred-id",
    });

    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-id", transports: undefined }],
      })
    );
  });

  it("rejects passkey sign-in when email does not match a user", async () => {
    mocks.findByEmail.mockResolvedValue(null);

    await expect(
      passkeyLoginService.getLoginOptions({ email: "missing@example.com" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects passkey sign-in when the account has no passkeys", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-id", signInEnabled: false, transports: null },
    ]);

    await expect(
      passkeyLoginService.getLoginOptions({ email: "user@example.com" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("builds allowCredentials when email resolves to a user", async () => {
    mocks.findByEmail.mockResolvedValue({ id: USER_ID });
    mocks.findByUserId.mockResolvedValue([
      { credentialId: "cred-id", signInEnabled: true, transports: null },
    ]);

    const result = await passkeyLoginService.getLoginOptions({ email: "user@example.com" });
    expect(result.options.challenge).toBe("login-challenge");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: "cred-id", transports: undefined }],
      })
    );
  });

  it("rejects reused or invalid login challenges", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("bad-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects unknown or sign-in-disabled credentials", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue(null);

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects credentials with sign-in disabled", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: false,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("wraps WebAuthn verification errors", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.verifyAuthenticationResponse.mockRejectedValue(new Error("bad sig"));

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects failed WebAuthn verification", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: false });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("issues login token and returns credential identity", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      id: "db-id",
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      authProvider: "credentials",
      passwordHash: "hash",
      emailVerifiedAt: new Date(),
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    mocks.issueLoginToken.mockResolvedValue("login-token");

    const result = await passkeyLoginService.verifyLogin(authResponse("login-challenge"));

    expect(result.loginToken).toBe("login-token");
    expect(result.credentialId).toBe("cred-id");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "passkey");
  });

  it("rejects passkey sign-in when user record is missing", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      id: "db-id",
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.findById.mockResolvedValue(null);
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects passkey sign-in for unverified credentials accounts when required", async () => {
    const original = process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN;
    process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN = "true";

    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "login-challenge" });
    mocks.findByCredentialId.mockResolvedValue({
      id: "db-id",
      userId: USER_ID,
      credentialId: "cred-id",
      signInEnabled: true,
      publicKey: Buffer.from("key").toString("base64url"),
      counter: "0",
      transports: null,
    });
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      authProvider: "credentials",
      passwordHash: "hash",
      emailVerifiedAt: null,
    });
    mocks.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    await expect(
      passkeyLoginService.verifyLogin(authResponse("login-challenge"))
    ).rejects.toMatchObject({ name: "EmailVerificationRequiredError" });

    if (original === undefined) {
      delete process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN;
    } else {
      process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN = original;
    }
  });
});
