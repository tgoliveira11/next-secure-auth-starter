import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccountPasskey } from "./register-account-passkey";

const mocks = vi.hoisted(() => ({
  registerOptions: vi.fn(),
  registerVerify: vi.fn(),
  startRegistration: vi.fn(),
}));

function useSensitiveRegistration() {
  const output = new Uint8Array([11, 12, 13, 14]);
  const registration = {
    id: "credential-id",
    clientExtensionResults: {
      nested: [{ prf: { enabled: true, results: { first: output } } }],
    },
  };
  mocks.startRegistration.mockResolvedValue(registration);
  return { output, registration };
}

function expectSensitiveRegistrationReleased(
  value: ReturnType<typeof useSensitiveRegistration>
) {
  expect([...value.output]).toEqual([0, 0, 0, 0]);
  expect(value.registration.clientExtensionResults.nested[0]).not.toHaveProperty("prf");
}

vi.mock("../api-client/passkey-account.js", () => ({
  passkeyAccountApi: {
    registerOptions: mocks.registerOptions,
    registerVerify: mocks.registerVerify,
  },
}));

vi.mock("../../modules/passkeys/lib/prepare-webauthn-options.js", () => ({
  prepareRegistrationOptions: (options: unknown) => options,
}));

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: mocks.startRegistration,
}));

describe("registerAccountPasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.registerOptions.mockResolvedValue({ challenge: "challenge" });
    mocks.startRegistration.mockResolvedValue({
      id: "credential-id",
      clientExtensionResults: {
        prf: { enabled: true, results: { first: "browser-only" } },
      },
    });
    mocks.registerVerify.mockResolvedValue({
      verified: true,
      credentialId: "credential-id",
    });
  });

  it("prepares options and invokes the browser-only hook after exact server verification", async () => {
    const prfSalt = new Uint8Array([1, 2, 3, 4]).buffer;
    const prepareOptions = vi.fn(async (options) => ({
      ...options,
      extensions: { prf: { eval: { first: prfSalt } } },
    }));
    let observedExtensionResults: unknown;
    const onVerified = vi.fn((context) => {
      observedExtensionResults = structuredClone(context.clientExtensionResults);
    });

    const result = await registerAccountPasskey({
      hooks: { prepareOptions, onVerified },
    });

    expect(prepareOptions).toHaveBeenCalledWith({ challenge: "challenge" });
    expect(mocks.startRegistration).toHaveBeenCalledWith({
      optionsJSON: {
        challenge: "challenge",
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    });
    expect(
      mocks.startRegistration.mock.calls[0]?.[0].optionsJSON.extensions.prf.eval.first
    ).toBe(prfSalt);
    expect(observedExtensionResults).toEqual({
      prf: { enabled: true, results: { first: "browser-only" } },
    });
    expect(result.integration.status).toBe("completed");
  });

  it("retains extension results through verification and the hook, then releases them", async () => {
    const sensitive = useSensitiveRegistration();
    let verificationSawPrf = false;
    mocks.registerVerify.mockImplementationOnce(async ({ response }) => {
      verificationSawPrf = "prf" in response.clientExtensionResults.nested[0];
      return { verified: true, credentialId: "credential-id" };
    });
    const onVerified = vi.fn((context) => {
      const results = context.clientExtensionResults as unknown as {
        nested: Array<Record<string, unknown>>;
      };
      expect("prf" in results.nested[0]).toBe(true);
    });

    await registerAccountPasskey({ hooks: { onVerified } });

    expect(verificationSawPrf).toBe(true);
    expect(onVerified).toHaveBeenCalledOnce();
    expectSensitiveRegistrationReleased(sensitive);
  });

  it("never invokes the hook when server and browser credential ids differ", async () => {
    const sensitive = useSensitiveRegistration();
    mocks.registerVerify.mockResolvedValue({ verified: true, credentialId: "different-id" });
    const onVerified = vi.fn();

    await expect(registerAccountPasskey({ hooks: { onVerified } })).rejects.toThrow(
      /credential verification mismatch/
    );
    expect(onVerified).not.toHaveBeenCalled();
    expectSensitiveRegistrationReleased(sensitive);
  });

  it("releases extension results when server verification throws", async () => {
    const sensitive = useSensitiveRegistration();
    mocks.registerVerify.mockRejectedValueOnce(new Error("verification unavailable"));

    await expect(registerAccountPasskey()).rejects.toThrow("verification unavailable");

    expectSensitiveRegistrationReleased(sensitive);
  });

  it("reports post-verification integration failure without undoing account registration", async () => {
    const sensitive = useSensitiveRegistration();
    const result = await registerAccountPasskey({
      hooks: {
        onVerified: () => {
          throw new Error("optional integration failed");
        },
      },
    });

    expect(result).toMatchObject({
      verified: true,
      credentialId: "credential-id",
      integration: { status: "failed" },
    });
    expectSensitiveRegistrationReleased(sensitive);
  });

  it("preserves standalone behavior when hooks are absent", async () => {
    const sensitive = useSensitiveRegistration();
    await expect(registerAccountPasskey()).resolves.toEqual({
      verified: true,
      credentialId: "credential-id",
      integration: { status: "not_configured" },
    });
    expectSensitiveRegistrationReleased(sensitive);
  });
});
