import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestPortableVaultGrant } from "./request-portable-vault-grant";

const mocks = vi.hoisted(() => ({
  options: vi.fn(),
  verify: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("../api-client/passkey-portable-vault-grants", () => ({
  passkeyPortableVaultGrantApi: {
    options: mocks.options,
    verify: mocks.verify,
  },
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

const input = {
  action: "unlock" as const,
  credentialDbId: "de305d54-75b4-431b-adb2-eb6b9e546014",
  envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
  ephemeralPublicKeyJwk: {
    kty: "EC" as const,
    crv: "P-256" as const,
    x: "A".repeat(43),
    y: "B".repeat(43),
  },
};

function useSensitiveAssertion() {
  const output = new Uint8Array([41, 42, 43]);
  const assertion = {
    id: "credential-id",
    clientExtensionResults: {
      prf: { results: { first: output } },
    },
  };
  mocks.startAuthentication.mockResolvedValue(assertion);
  return { assertion, output };
}

describe("requestPortableVaultGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.options.mockResolvedValue({
      requestId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      options: { challenge: "challenge", userVerification: "required" },
    });
    mocks.startAuthentication.mockResolvedValue({
      id: "credential-id",
      clientExtensionResults: {},
    });
    mocks.verify.mockResolvedValue({
      requestId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      verifiedCredentialId: "credential-id",
      grant: "signed-grant",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
  });

  it("runs a dedicated exact-credential ceremony and returns the signed grant", async () => {
    await expect(requestPortableVaultGrant(input)).resolves.toMatchObject({
      verifiedCredentialId: "credential-id",
      grant: "signed-grant",
    });

    expect(mocks.options).toHaveBeenCalledWith(input);
    expect(mocks.startAuthentication).toHaveBeenCalledWith({
      optionsJSON: { challenge: "challenge", userVerification: "required" },
    });
    expect(mocks.verify).toHaveBeenCalledWith({
      requestId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      action: "unlock",
      envelopeId: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
      response: expect.objectContaining({ id: "credential-id" }),
    });
  });

  it("fails closed when the server verifies a different request or credential", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.verify.mockResolvedValue({
      requestId: "4b14eebc-bdec-4a07-802a-598e4934187d",
      verifiedCredentialId: "another-credential",
      grant: "signed-grant",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    await expect(requestPortableVaultGrant(input)).rejects.toThrow(
      "Portable vault grant credential verification mismatch"
    );
    expect([...sensitive.output]).toEqual([0, 0, 0]);
    expect(sensitive.assertion.clientExtensionResults).not.toHaveProperty("prf");
  });

  it("releases sensitive browser extension output when verification fails", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.verify.mockRejectedValue(new Error("verification unavailable"));

    await expect(requestPortableVaultGrant(input)).rejects.toThrow("verification unavailable");
    expect([...sensitive.output]).toEqual([0, 0, 0]);
    expect(sensitive.assertion.clientExtensionResults).not.toHaveProperty("prf");
  });
});
