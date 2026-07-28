import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableAccountPasskeySignIn } from "./enable-account-passkey-sign-in";

const mocks = vi.hoisted(() => ({
  enableSignInOptions: vi.fn(),
  enableSignInVerify: vi.fn(),
  startAuthentication: vi.fn(),
}));

function useSensitiveAssertion() {
  const output = new Uint8Array([31, 32, 33, 34]);
  const assertion = {
    id: "credential-id",
    clientExtensionResults: {
      nested: [{ prf: { results: { first: output } } }],
    },
  };
  mocks.startAuthentication.mockResolvedValue(assertion);
  return { assertion, output };
}

function expectSensitiveAssertionReleased(value: ReturnType<typeof useSensitiveAssertion>) {
  expect([...value.output]).toEqual([0, 0, 0, 0]);
  expect(value.assertion.clientExtensionResults.nested[0]).not.toHaveProperty("prf");
}

vi.mock("../api-client/passkey-account", () => ({
  passkeyAccountApi: {
    enableSignInOptions: mocks.enableSignInOptions,
    enableSignInVerify: mocks.enableSignInVerify,
  },
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

describe("enableAccountPasskeySignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enableSignInOptions.mockResolvedValue({ options: { challenge: "challenge" } });
    mocks.startAuthentication.mockResolvedValue({
      id: "credential-id",
      clientExtensionResults: {},
    });
    mocks.enableSignInVerify.mockResolvedValue({
      verified: true,
      credentialId: "credential-id",
      signInEnabled: true,
    });
  });

  it("authenticates the exact existing credential and enables sign-in", async () => {
    const sensitive = useSensitiveAssertion();
    let verificationSawPrf = false;
    mocks.enableSignInVerify.mockImplementationOnce(async (_id, { response }) => {
      verificationSawPrf = "prf" in response.clientExtensionResults.nested[0];
      return {
        verified: true,
        credentialId: "credential-id",
        signInEnabled: true,
      };
    });

    await expect(enableAccountPasskeySignIn("credential-db-id")).resolves.toEqual({
      verified: true,
      credentialId: "credential-id",
      signInEnabled: true,
    });
    expect(mocks.enableSignInOptions).toHaveBeenCalledWith("credential-db-id");
    expect(mocks.enableSignInVerify).toHaveBeenCalledWith("credential-db-id", {
      response: expect.objectContaining({ id: "credential-id" }),
    });
    expect(mocks.startAuthentication).toHaveBeenCalledWith({
      optionsJSON: { challenge: "challenge" },
    });
    expect(verificationSawPrf).toBe(true);
    expectSensitiveAssertionReleased(sensitive);
  });

  it("fails closed on a server/browser credential mismatch", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.enableSignInVerify.mockResolvedValue({
      verified: true,
      credentialId: "different-id",
      signInEnabled: true,
    });

    await expect(enableAccountPasskeySignIn("credential-db-id")).rejects.toThrow(
      /credential verification mismatch/
    );
    expectSensitiveAssertionReleased(sensitive);
  });

  it("releases extension results when capability verification throws", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.enableSignInVerify.mockRejectedValueOnce(new Error("verification unavailable"));

    await expect(enableAccountPasskeySignIn("credential-db-id")).rejects.toThrow(
      "verification unavailable"
    );

    expectSensitiveAssertionReleased(sensitive);
  });
});
