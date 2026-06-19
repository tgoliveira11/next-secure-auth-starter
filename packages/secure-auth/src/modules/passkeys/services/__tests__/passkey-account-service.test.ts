import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClient } from "@/lib/db/types";
import { createPasskeyAccountService } from "../passkey-account-service";
import { PasskeyAccountBoundaryError } from "../passkey-service";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findByIdForUser: vi.fn(),
  revoke: vi.fn(),
  record: vi.fn(),
  storeChallenge: vi.fn(),
  consumeValidChallenge: vi.fn(),
  createCredential: vi.fn(),
  runInTransaction: vi.fn(async <T>(fn: (tx: DbClient) => Promise<T>) => fn({} as DbClient)),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(async (opts) => ({
    challenge: "test-challenge",
    rp: { name: "Test", id: "localhost" },
    user: { id: "user-id", name: "user@example.com", displayName: "user@example.com" },
    pubKeyCredParams: [],
    excludeCredentials: opts.excludeCredentials,
  })),
  verifyRegistrationResponse: vi.fn(),
}));

function createService() {
  return createPasskeyAccountService({
    ctx: {
      getWebAuthnRpName: () => "Test",
      getWebAuthnRpId: () => "localhost",
      getWebAuthnOrigins: () => ["http://localhost:3003"],
    } as never,
    repos: {
      passkeyRepository: {
        findByUserId: mocks.findByUserId,
        findByIdForUser: mocks.findByIdForUser,
        revoke: mocks.revoke,
        storeChallenge: mocks.storeChallenge,
        consumeValidChallenge: mocks.consumeValidChallenge,
        createCredential: mocks.createCredential,
      },
      auditRepository: {
        record: mocks.record,
      },
    } as never,
    rateLimit: { enforceRateLimit: vi.fn() } as never,
    runInTransaction: mocks.runInTransaction as never,
  });
}

function buildRegistrationVerifyResponse() {
  return {
    id: "new-cred-id",
    rawId: "new-cred-id",
    type: "public-key" as const,
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({ challenge: "test-challenge", type: "webauthn.create" })
      ).toString("base64url"),
      attestationObject: "attestation",
    },
    clientExtensionResults: {},
    authenticatorAttachment: "platform" as const,
  };
}

describe("passkey account service capability boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeChallenge.mockResolvedValue(undefined);
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "test-challenge", userId: "user-1" });
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "new-cred-id",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
        aaguid: "00000000-0000-0000-0000-000000000000",
      },
    } as never);
    mocks.createCredential.mockResolvedValue({ id: "pk-new" });
  });

  it("lists vault-only credentials as non-removable", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        id: "pk-vault",
        friendlyName: "Vault passkey",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastUsedAt: null,
        signInEnabled: false,
        vaultUnlockEnabled: true,
      },
    ]);

    const service = createService();
    const passkeys = await service.listPasskeys("user-1");

    expect(passkeys[0]).toMatchObject({
      signInEnabled: false,
      vaultUnlockEnabled: true,
      removableFromAccountSettings: false,
      badge: "Vault unlock only",
    });
  });

  it("allows removing sign-in-only credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      signInEnabled: true,
      vaultUnlockEnabled: false,
    });
    mocks.revoke.mockResolvedValue({ id: "pk-1" });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-1")).resolves.toEqual({ success: true });
    expect(mocks.revoke).toHaveBeenCalled();
  });

  it("rejects removing vault-only credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-vault",
      signInEnabled: false,
      vaultUnlockEnabled: true,
    });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-vault")).rejects.toBeInstanceOf(
      PasskeyAccountBoundaryError
    );
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it("rejects removing dual-capability credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-dual",
      signInEnabled: true,
      vaultUnlockEnabled: true,
    });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-dual")).rejects.toBeInstanceOf(
      PasskeyAccountBoundaryError
    );
  });
});

describe("passkey account service registration options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeChallenge.mockResolvedValue(undefined);
  });

  it("includes sign-in credentials in excludeCredentials", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "auth-1",
        signInEnabled: true,
        vaultUnlockEnabled: false,
        transports: ["internal"],
      },
    ]);

    const service = createService();
    const options = await service.getRegistrationOptions("user-1", "user@example.com");

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [{ id: "auth-1", transports: ["internal"] }],
      })
    );
    expect(options.excludeCredentials).toEqual([{ id: "auth-1", transports: ["internal"] }]);
  });

  it("does not include vault-only credentials in excludeCredentials", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "vault-1",
        signInEnabled: false,
        vaultUnlockEnabled: true,
        transports: ["internal"],
      },
    ]);

    const service = createService();
    await service.getRegistrationOptions("user-1", "user@example.com");

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [],
      })
    );
  });

  it("includes only sign-in credentials from a mixed list", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "auth-1",
        signInEnabled: true,
        vaultUnlockEnabled: false,
        transports: null,
      },
      {
        credentialId: "vault-1",
        signInEnabled: false,
        vaultUnlockEnabled: true,
        transports: null,
      },
    ]);

    const service = createService();
    await service.getRegistrationOptions("user-1", "user@example.com");

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [{ id: "auth-1", transports: undefined }],
      })
    );
  });

  it("includes dual-capability credentials in excludeCredentials", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        credentialId: "dual-1",
        signInEnabled: true,
        vaultUnlockEnabled: true,
        transports: ["hybrid"],
      },
    ]);

    const service = createService();
    await service.getRegistrationOptions("user-1", "user@example.com");

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [{ id: "dual-1", transports: ["hybrid"] }],
      })
    );
  });
});

describe("passkey account service verifyRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeValidChallenge.mockResolvedValue({ challenge: "test-challenge", userId: "user-1" });
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "new-cred-id",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
        aaguid: "00000000-0000-0000-0000-000000000000",
      },
    } as never);
    mocks.createCredential.mockResolvedValue({ id: "pk-new" });
  });

  it("creates account sign-in credentials with signInEnabled true and vaultUnlockEnabled false", async () => {
    const service = createService();
    await service.verifyRegistration("user-1", buildRegistrationVerifyResponse());

    expect(mocks.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        credentialId: "new-cred-id",
        signInEnabled: true,
        vaultUnlockEnabled: false,
      }),
      expect.anything()
    );
  });

  it("does not modify existing vault-only credentials during registration", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        id: "pk-vault",
        credentialId: "vault-1",
        signInEnabled: false,
        vaultUnlockEnabled: true,
      },
    ]);

    const service = createService();
    await service.verifyRegistration("user-1", buildRegistrationVerifyResponse());

    expect(mocks.createCredential).toHaveBeenCalledTimes(1);
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialId: "new-cred-id",
        signInEnabled: true,
        vaultUnlockEnabled: false,
      }),
      expect.anything()
    );
  });
});
