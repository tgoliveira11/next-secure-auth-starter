import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SecureAuthServices } from "@/core/types";
import { getTestServices } from "@/test/helpers/mock-services";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOptions: vi.fn(),
  verifyAndIssueGrant: vi.fn(),
  finalizeReceipt: vi.fn(),
}));

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireUser,
}));

let services: SecureAuthServices;

const requestId = "de305d54-75b4-431b-adb2-eb6b9e546014";
const credentialDbId = "4b14eebc-bdec-4a07-802a-598e4934187d";

function post(path: string, body: unknown) {
  return new Request(`http://localhost:3001${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3001" },
    body: JSON.stringify(body),
  });
}

async function buildServices() {
  return getTestServices({}, (base) => ({
    passkeyGrantService: {
      ...base.passkeyGrantService,
      getOptions: mocks.getOptions,
      verifyAndIssueGrant: mocks.verifyAndIssueGrant,
      finalizeReceipt: mocks.finalizeReceipt,
    },
  }));
}

describe("portable vault grant routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountSessionId: "session-1",
    });
    mocks.getOptions.mockResolvedValue({
      requestId,
      options: { challenge: "challenge", userVerification: "required" },
    });
    mocks.verifyAndIssueGrant.mockResolvedValue({
      requestId,
      verifiedCredentialId: "credential-id",
      grant: "signed-grant",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    mocks.finalizeReceipt.mockResolvedValue({
      requestId,
      credentialId: "credential-id",
      action: "enroll",
      vaultUnlockEnabled: true,
      completed: true,
    });
    services = await buildServices();
  });

  it("starts a session-bound, exact-credential grant ceremony", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-options.js"
    );
    const body = {
      action: "unlock",
      credentialDbId,
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      ephemeralPublicKeyJwk: {
        kty: "EC",
        crv: "P-256",
        x: "A".repeat(43),
        y: "B".repeat(43),
      },
    };
    const response = await createPostHandler(services)(
      post("/api/account/passkeys/portable-vault-grants/options", body)
    );

    expect(response.status).toBe(200);
    expect(mocks.getOptions).toHaveBeenCalledWith(
      { userId: "user-1", accountSessionId: "session-1" },
      body,
      expect.anything()
    );
  });

  it("rejects malformed option requests and sessions without an account-session binding", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-options.js"
    );
    const handler = createPostHandler(services);
    const malformed = await handler(
      post("/api/account/passkeys/portable-vault-grants/options", { action: "unlock" })
    );
    expect(malformed.status).toBe(400);

    mocks.requireUser.mockResolvedValueOnce({ id: "user-1", email: "user@example.com" });
    const unbound = await handler(
      post("/api/account/passkeys/portable-vault-grants/options", {
        action: "unlock",
        credentialDbId,
        envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
        ephemeralPublicKeyJwk: {
          kty: "EC",
          crv: "P-256",
          x: "A".repeat(43),
          y: "B".repeat(43),
        },
      })
    );
    expect(unbound.status).toBe(401);
  });

  it("verifies a sanitized assertion and returns the signed grant", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-verify.js"
    );
    const body = {
      requestId,
      action: "unlock",
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      response: { id: "credential-id", clientExtensionResults: {} },
    };
    const response = await createPostHandler(services)(
      post("/api/account/passkeys/portable-vault-grants/verify", body)
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyAndIssueGrant).toHaveBeenCalledWith(
      { userId: "user-1", accountSessionId: "session-1" },
      body,
      expect.anything()
    );
  });

  it("rejects any nested PRF material before invoking verification", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-verify.js"
    );
    const response = await createPostHandler(services)(
      post("/api/account/passkeys/portable-vault-grants/verify", {
        requestId,
        action: "unlock",
        envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
        response: {
          id: "credential-id",
          clientExtensionResults: { nested: { prf_output: "secret" } },
        },
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.verifyAndIssueGrant).not.toHaveBeenCalled();
  });

  it("rejects malformed verification requests", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-verify.js"
    );
    const response = await createPostHandler(services)(
      post("/api/account/passkeys/portable-vault-grants/verify", {
        requestId: "not-a-uuid",
        action: "unlock",
        envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      })
    );
    expect(response.status).toBe(400);
  });

  it("finalizes a broker receipt only in the current account session", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-finalize.js"
    );
    const response = await createPostHandler(services)(
      post("/api/account/passkeys/portable-vault-grants/finalize", {
        receipt: "signed-receipt",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.finalizeReceipt).toHaveBeenCalledWith(
      { userId: "user-1", accountSessionId: "session-1" },
      "signed-receipt",
      expect.anything()
    );
  });

  it("rejects malformed receipts and maps service errors", async () => {
    const { createPostHandler } = await import(
      "../account/passkey-portable-vault-grant-finalize.js"
    );
    const handler = createPostHandler(services);
    const malformed = await handler(
      post("/api/account/passkeys/portable-vault-grants/finalize", { receipt: "" })
    );
    expect(malformed.status).toBe(400);

    mocks.finalizeReceipt.mockRejectedValueOnce(
      Object.assign(new Error("invalid receipt"), { name: "ValidationError" })
    );
    const invalid = await handler(
      post("/api/account/passkeys/portable-vault-grants/finalize", {
        receipt: "signed-receipt",
      })
    );
    expect(invalid.status).toBe(400);
  });
});
