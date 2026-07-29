import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "@/lib/db/types";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createPasskeyGrantService } from "../passkey-grant-service";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  findByIdForUser: vi.fn(),
  createOperation: vi.fn(),
  findPendingOperation: vi.fn(),
  consumeChallengeAndRecordGrant: vi.fn(),
  findGrantedOperation: vi.fn(),
  completeWithReceipt: vi.fn(),
  advanceCounter: vi.fn(),
  updateLastUsedAt: vi.fn(),
  updateCredentialFlags: vi.fn(),
  revoke: vi.fn(),
  recordAudit: vi.fn(),
  signGrant: vi.fn(),
  verifyReceipt: vi.fn(),
  runInTransaction: vi.fn(async <T>(fn: (tx: DbClient) => Promise<T>) =>
    fn({} as DbClient)
  ),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("../../lib/portable-vault-grant-crypto", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../lib/portable-vault-grant-crypto")
  >();
  return {
    ...actual,
    normalizeAndThumbprintEphemeralPublicKey: vi.fn((jwk) => ({
      jwk,
      thumbprint: "ephemeral-jkt",
    })),
    hashPortableVaultOperationValue: vi.fn((value: string) => `hash:${value}`),
    derivePortableVaultOpaqueSubjectId: vi.fn(() => "opaque-subject"),
    createPortableVaultGrantJti: vi.fn(() => "grant-jti-value-123456"),
    requirePortableVaultGrantsConfig: vi.fn(() => ({
      enabled: true,
      issuer: "https://auth.example.com",
      appId: "app-1",
      ttlSeconds: 60,
      opaqueSubjectKey: "A".repeat(43),
      audience: "https://vault-broker.example.com",
      grantPrivateJwkB64: "private",
      brokerReceiptIssuer: "https://vault-broker.example.com",
      brokerReceiptPublicJwksB64: "public",
    })),
    signPortableVaultGrant: mocks.signGrant,
    verifyPortableVaultBrokerReceipt: mocks.verifyReceipt,
  };
});

const session = { userId: "user-1", accountSessionId: "session-1" };
const requestId = "de305d54-75b4-431b-adb2-eb6b9e546014";
const nowSeconds = Math.floor(Date.now() / 1000);

const credential = {
  id: "credential-db-id",
  credentialId: "credential-id",
  publicKey: Buffer.from([1, 2, 3]).toString("base64url"),
  counter: "0",
  counterRevision: 3,
  transports: ["internal"],
  signInEnabled: true,
  vaultUnlockEnabled: true,
};

function createService() {
  return createPasskeyGrantService({
    ctx: {
      config: { webauthn: {} },
      getWebAuthnRpId: () => "example.com",
      getWebAuthnOrigins: () => ["https://example.com"],
      toPasskeyVerificationErrorMessage: () => "Passkey verification failed",
    } as never,
    repos: {
      passkeyRepository: {
        findByIdForUser: mocks.findByIdForUser,
        advanceCounter: mocks.advanceCounter,
        updateLastUsedAt: mocks.updateLastUsedAt,
        updateCredentialFlags: mocks.updateCredentialFlags,
        revoke: mocks.revoke,
      },
      passkeyGrantRepository: {
        createOperation: mocks.createOperation,
        findPendingOperation: mocks.findPendingOperation,
        consumeChallengeAndRecordGrant: mocks.consumeChallengeAndRecordGrant,
        findGrantedOperation: mocks.findGrantedOperation,
        completeWithReceipt: mocks.completeWithReceipt,
      },
      auditRepository: { record: mocks.recordAudit },
    } as never,
    rateLimit: { enforceRateLimit: mocks.enforceRateLimit } as never,
    runInTransaction: mocks.runInTransaction as never,
  });
}

function assertion(id = "credential-id", challenge = "challenge") {
  return {
    id,
    rawId: id,
    type: "public-key" as const,
    response: {
      clientDataJSON: Buffer.from(JSON.stringify({ challenge })).toString("base64url"),
      authenticatorData: "authenticator-data",
      signature: "signature",
    },
    clientExtensionResults: {},
  };
}

function pendingOperation(action: "unlock" | "enroll" | "revoke" = "unlock") {
  return {
    requestId,
    userId: "user-1",
    accountSessionId: "session-1",
    credentialDbId: credential.id,
    action,
    envelopeIdHash: "hash:7dd12781-7a93-49bc-87fc-2fc076304ccc",
    ephemeralPublicKeyThumbprint: "ephemeral-jkt",
  };
}

function receiptClaims(action: "unlock" | "enroll" | "revoke" = "enroll") {
  return {
    iss: "https://broker.example.com",
    aud: "https://auth.example.com",
    app_id: "app-1",
    sub: "opaque-subject",
    purpose: "portable_vault_completion" as const,
    action,
    grant_jti: "grant-jti-value-123456",
    request_id: requestId,
    envelope_id: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
    credential_id: "credential-id",
    jti: "receipt-jti-value-123456",
    iat: nowSeconds,
    exp: nowSeconds + 120,
    outcome: "completed" as const,
  };
}

describe("passkey portable vault grant service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({
      challenge: "challenge",
      allowCredentials: [{ id: "credential-id", transports: ["internal"] }],
      userVerification: "required",
    } as never);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 0 },
    } as never);
    mocks.findByIdForUser.mockResolvedValue(credential);
    mocks.createOperation.mockResolvedValue({ requestId });
    mocks.findPendingOperation.mockResolvedValue(pendingOperation());
    mocks.consumeChallengeAndRecordGrant.mockResolvedValue({ requestId });
    mocks.advanceCounter.mockResolvedValue("advanced");
    mocks.signGrant.mockResolvedValue("signed-grant");
    mocks.verifyReceipt.mockResolvedValue(receiptClaims());
    mocks.findGrantedOperation.mockResolvedValue({
      ...pendingOperation("enroll"),
      challengeConsumedAt: new Date((nowSeconds - 1) * 1000),
      grantJtiHash: "hash:grant-jti-value-123456",
    });
    mocks.completeWithReceipt.mockResolvedValue({ requestId });
    mocks.updateCredentialFlags.mockResolvedValue(credential);
  });

  it("creates UV-required options for exactly the selected eligible credential", async () => {
    const service = createService();
    const result = await service.getOptions(session, {
      action: "enroll",
      credentialDbId: credential.id,
    });

    expect(result.requestId).toBe(requestId);
    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "example.com",
      allowCredentials: [{ id: "credential-id", transports: ["internal"] }],
      userVerification: "required",
    });
    expect(mocks.createOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        accountSessionId: "session-1",
        challengeHash: "hash:challenge",
        envelopeIdHash: null,
        ephemeralPublicKeyThumbprint: null,
      })
    );
  });

  it("rejects an ineligible credential before creating an operation", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      ...credential,
      signInEnabled: false,
      vaultUnlockEnabled: false,
    });
    const service = createService();

    await expect(
      service.getOptions(session, {
        action: "enroll",
        credentialDbId: credential.id,
      })
    ).rejects.toMatchObject({ name: "ConflictError" });
    expect(mocks.createOperation).not.toHaveBeenCalled();
  });

  it("issues a short-lived grant only after exact credential verification and atomic consumption", async () => {
    const service = createService();
    const result = await service.verifyAndIssueGrant(session, {
      requestId,
      action: "unlock",
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      response: assertion(),
    });

    expect(result).toMatchObject({
      requestId,
      verifiedCredentialId: "credential-id",
      grant: "signed-grant",
    });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: "challenge",
        expectedOrigin: ["https://example.com"],
        expectedRPID: "example.com",
        requireUserVerification: true,
        credential: expect.objectContaining({ id: "credential-id" }),
      })
    );
    expect(mocks.signGrant).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        purpose: "portable_vault",
        action: "unlock",
        sub: "opaque-subject",
        credential_id: "credential-id",
        epk_thumbprint: "ephemeral-jkt",
        envelope_id: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
        uv: true,
      })
    );
    expect(mocks.consumeChallengeAndRecordGrant).toHaveBeenCalled();
    expect(mocks.advanceCounter).toHaveBeenCalledWith(
      "credential-id",
      "0",
      "0",
      3,
      expect.anything()
    );
  });

  it("rejects credential substitution and operation replay", async () => {
    const service = createService();
    await expect(
      service.verifyAndIssueGrant(session, {
        requestId,
        action: "unlock",
        envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
        response: assertion("substituted-credential"),
      })
    ).rejects.toMatchObject({ name: "ChallengeError" });
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();

    mocks.consumeChallengeAndRecordGrant.mockResolvedValueOnce(null);
    await expect(
      service.verifyAndIssueGrant(session, {
        requestId,
        action: "unlock",
        envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
        response: assertion(),
      })
    ).rejects.toMatchObject({ name: "ChallengeError" });
  });

  it("enables vault capability only after an exact single-use broker receipt", async () => {
    const service = createService();
    const result = await service.finalizeReceipt(session, "signed-receipt");

    expect(result).toEqual({
      requestId,
      credentialId: "credential-id",
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      action: "enroll",
      vaultUnlockEnabled: true,
      completed: true,
    });
    expect(mocks.completeWithReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        grantJtiHash: "hash:grant-jti-value-123456",
        receiptJtiHash: "hash:receipt-jti-value-123456",
      }),
      expect.anything()
    );
    expect(mocks.updateCredentialFlags).toHaveBeenCalledWith(
      credential.id,
      "user-1",
      { vaultUnlockEnabled: true },
      expect.anything()
    );
  });

  it("preserves sign-in when a receipt revokes only the vault capability", async () => {
    mocks.verifyReceipt.mockResolvedValue(receiptClaims("revoke"));
    mocks.findGrantedOperation.mockResolvedValue({
      ...pendingOperation("revoke"),
      challengeConsumedAt: new Date((nowSeconds - 1) * 1000),
      grantJtiHash: "hash:grant-jti-value-123456",
    });
    mocks.updateCredentialFlags.mockResolvedValue({
      ...credential,
      signInEnabled: true,
      vaultUnlockEnabled: false,
    });
    const service = createService();

    await expect(service.finalizeReceipt(session, "signed-receipt")).resolves.toMatchObject({
      action: "revoke",
      vaultUnlockEnabled: false,
    });
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it("single-use consumes an unlock receipt without mutating credential capabilities", async () => {
    mocks.verifyReceipt.mockResolvedValue(receiptClaims("unlock"));
    mocks.findGrantedOperation.mockResolvedValue({
      ...pendingOperation("unlock"),
      challengeConsumedAt: new Date((nowSeconds - 1) * 1000),
      grantJtiHash: "hash:grant-jti-value-123456",
    });
    const service = createService();

    await expect(service.finalizeReceipt(session, "signed-receipt")).resolves.toEqual({
      requestId,
      credentialId: "credential-id",
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      action: "unlock",
      completed: true,
    });
    expect(mocks.completeWithReceipt).toHaveBeenCalled();
    expect(mocks.updateCredentialFlags).not.toHaveBeenCalled();
  });

  it("rejects mismatched and replayed completion receipts before changing credential flags", async () => {
    mocks.verifyReceipt.mockResolvedValue({ ...receiptClaims(), sub: "wrong-subject" });
    const service = createService();
    await expect(service.finalizeReceipt(session, "signed-receipt")).rejects.toMatchObject({
      name: "ValidationError",
    });
    expect(mocks.updateCredentialFlags).not.toHaveBeenCalled();

    mocks.verifyReceipt.mockResolvedValue(receiptClaims());
    mocks.completeWithReceipt.mockResolvedValueOnce(null);
    await expect(service.finalizeReceipt(session, "signed-receipt")).rejects.toMatchObject({
      name: "ConflictError",
    });
    expect(mocks.updateCredentialFlags).not.toHaveBeenCalled();
  });
});
