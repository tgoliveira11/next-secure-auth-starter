import { describe, it, expect, vi, beforeEach } from "vitest";
import { passkeyAccountService } from "@/server/services/passkey-account-service";
import { ChallengeError, NotFoundError } from "@/server/services/passkey-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findByIdForUser: vi.fn(),
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  createCredential: vi.fn(),
  updateCredentialFlags: vi.fn(),
  updateCounter: vi.fn(),
  revoke: vi.fn(),
  record: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mocks.generateRegistrationOptions,
  verifyRegistrationResponse: mocks.verifyRegistrationResponse,
}));

vi.mock("@/server/repositories/passkey-repository", () => ({
  passkeyRepository: {
    findByUserId: mocks.findByUserId,
    findByIdForUser: mocks.findByIdForUser,
    storeChallenge: mocks.storeChallenge,
    consumeValidChallenge: mocks.consumeValidChallenge,
    createCredential: mocks.createCredential,
    updateCredentialFlags: mocks.updateCredentialFlags,
    updateCounter: mocks.updateCounter,
    revoke: mocks.revoke,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

function registrationResponse(challenge: string) {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: "webauthn.create", challenge, origin: "http://localhost:3001" })
  ).toString("base64url");
  return {
    id: "cred-id",
    rawId: "cred-id",
    type: "public-key",
    response: { clientDataJSON, attestationObject: "oA" },
    clientExtensionResults: {},
  };
}

describe("passkey account service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.findByUserId.mockResolvedValue([]);
  });

  it("lists passkeys with account fields", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        id: "pk-1",
        friendlyName: "Laptop",
        signInEnabled: true,
        createdAt: new Date("2026-01-01"),
        lastUsedAt: null,
      },
      {
        id: "pk-2",
        friendlyName: null,
        signInEnabled: true,
        createdAt: new Date("2026-01-02"),
        lastUsedAt: new Date("2026-01-03"),
      },
    ]);

    const result = await passkeyAccountService.listPasskeys(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].signInEnabled).toBe(true);
    expect(result[1].friendlyName).toBe("Passkey");
  });

  it("rejects invalid registration challenge", async () => {
    mocks.consumeValidChallenge.mockRejectedValue(new Error("expired"));
    await expect(
      passkeyAccountService.verifyRegistration(USER_ID, registrationResponse("bad"))
    ).rejects.toBeInstanceOf(ChallengeError);
  });

  it("rejects failed registration attestation", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({ verified: false });
    await expect(
      passkeyAccountService.verifyRegistration(USER_ID, registrationResponse("reg-challenge"))
    ).rejects.toThrow("Passkey registration failed");
  });

  it("registers passkey for sign-in", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array(32),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
      },
    });

    const result = await passkeyAccountService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge")
    );

    expect(result.verified).toBe(true);
    expect(mocks.createCredential).toHaveBeenCalled();
  });

  it("uses default friendly names based on device type", async () => {
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "reg-challenge" });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array(32),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "multiDevice",
      },
    });

    await passkeyAccountService.verifyRegistration(
      USER_ID,
      registrationResponse("reg-challenge")
    );

    expect(mocks.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({ friendlyName: "Synced passkey" }),
      expect.anything()
    );
  });

  it("removes passkey by id", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      credentialId: "cred-id",
    });

    const result = await passkeyAccountService.removePasskey(USER_ID, "pk-1");
    expect(result.success).toBe(true);
    expect(mocks.revoke).toHaveBeenCalled();
  });

  it("throws when passkey not found", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(passkeyAccountService.removePasskey(USER_ID, "missing")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("returns registration options and stores challenge", async () => {
    const options = await passkeyAccountService.getRegistrationOptions(
      USER_ID,
      "user@example.com"
    );
    expect(options.challenge).toBe("reg-challenge");
    expect(mocks.storeChallenge).toHaveBeenCalled();
  });

  it("excludes existing credentials with transports from registration options", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "existing-cred",
        transports: ["internal", "hybrid"],
      },
    ]);

    await passkeyAccountService.getRegistrationOptions(USER_ID, "user@example.com");

    expect(mocks.generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [{ id: "existing-cred", transports: ["internal", "hybrid"] }],
      })
    );
  });
});
