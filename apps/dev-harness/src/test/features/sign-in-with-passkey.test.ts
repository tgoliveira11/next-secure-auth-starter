/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPasskeyLoginOptionsPayload,
  signInWithPasskey,
  getPasskeyLoginUnsupportedMessage,
  buildPasskeyLoginOutcomeKey,
} from "../../../../../packages/secure-auth/src/lib/passkey/sign-in-with-passkey.js";
import { APP_SLUG } from "@/lib/brand";
import { USER_ID } from "@/test/helpers/fixtures";

const PASSKEY_LOGIN_OUTCOME_KEY = buildPasskeyLoginOutcomeKey(APP_SLUG);
const PASSKEY_OPTIONS = { appSlug: APP_SLUG };

const mocks = vi.hoisted(() => ({
  options: vi.fn(),
  verify: vi.fn(),
  signIn: vi.fn(),
  startAuthentication: vi.fn(),
  getPasskeyLoginHint: vi.fn(),
  setPasskeyLoginHint: vi.fn(),
}));

function useSensitiveAssertion() {
  const output = new Uint8Array([21, 22, 23, 24]);
  const assertion = {
    id: "cred-id",
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

vi.mock(
  "../../../../../packages/secure-auth/src/lib/api-client/passkey-login.js",
  () => ({
    passkeyLoginApi: {
      options: mocks.options,
      verify: mocks.verify,
    },
  })
);

vi.mock(
  "../../../../../packages/secure-auth/src/modules/passkeys/lib/prepare-webauthn-options.js",
  () => ({ prepareAuthenticationOptions: (options: unknown) => options })
);

vi.mock(
  "../../../../../packages/secure-auth/src/modules/passkeys/lib/login-hint.js",
  () => ({
    getPasskeyLoginHint: mocks.getPasskeyLoginHint,
    setPasskeyLoginHint: mocks.setPasskeyLoginHint,
  })
);

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

describe("buildPasskeyLoginOptionsPayload", () => {
  it("prefers email over saved hint", () => {
    expect(
      buildPasskeyLoginOptionsPayload("user@example.com", {
        userId: USER_ID,
        credentialId: "cred-id",
      })
    ).toEqual({ email: "user@example.com" });
  });

  it("uses credentialId with userId when both are saved", () => {
    expect(
      buildPasskeyLoginOptionsPayload(undefined, { userId: USER_ID, credentialId: "cred-id" })
    ).toEqual({ credentialId: "cred-id", userId: USER_ID });
  });

  it("uses saved userId when credentialId is missing", () => {
    expect(buildPasskeyLoginOptionsPayload(undefined, { userId: USER_ID })).toEqual({
      userId: USER_ID,
    });
  });

  it("returns undefined when no email or hint exists", () => {
    expect(buildPasskeyLoginOptionsPayload(undefined, null)).toBeUndefined();
  });
});

describe("signInWithPasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.getPasskeyLoginHint.mockReturnValue({ userId: USER_ID, credentialId: "cred-id" });
    mocks.options.mockResolvedValue({ options: { challenge: "c" } });
    mocks.startAuthentication.mockResolvedValue({
      id: "cred-id",
      clientExtensionResults: {},
    });
    mocks.verify.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    mocks.signIn.mockResolvedValue({ ok: true, error: null });
    vi.stubGlobal(
      "PublicKeyCredential",
      Object.assign(function PublicKeyCredential() {}, {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(),
      })
    );
    if (typeof window !== "undefined") {
      // @ts-expect-error test stub
      window.PublicKeyCredential = globalThis.PublicKeyCredential;
    }
  });

  it("returns unsupported when passkeys are unavailable", async () => {
    // @ts-expect-error test-specific override
    globalThis.PublicKeyCredential = undefined;
    const result = await signInWithPasskey(undefined, PASSKEY_OPTIONS);
    expect(result.outcome).toBe("unsupported");
  });

  it("routes to two-factor page when passkey verify requires TOTP", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.verify.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const onFullyAuthenticated = vi.fn();
    const result = await signInWithPasskey(undefined, {
      ...PASSKEY_OPTIONS,
      loginTwoFactorPath: "/login/2fa?mode=credentials",
      hooks: { onFullyAuthenticated },
    });
    expect(result.outcome).toBe("requires-two-factor");
    expect(result.redirectTo).toBe("/login/2fa?mode=credentials");
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(onFullyAuthenticated).not.toHaveBeenCalled();
    expectSensitiveAssertionReleased(sensitive);
  });

  it("signs in and routes to dashboard", async () => {
    const sensitive = useSensitiveAssertion();
    const result = await signInWithPasskey(undefined, PASSKEY_OPTIONS);
    expect(mocks.options).toHaveBeenCalledWith({
      credentialId: "cred-id",
      userId: USER_ID,
    });
    expect(mocks.setPasskeyLoginHint).toHaveBeenCalledWith(APP_SLUG, {
      userId: USER_ID,
      credentialId: "cred-id",
    });
    expect(result.outcome).toBe("signed-in");
    expect(result.redirectTo).toBe("/dashboard");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("signed-in");
    expectSensitiveAssertionReleased(sensitive);
  });

  it("handles user cancellation during WebAuthn", async () => {
    mocks.startAuthentication.mockRejectedValue(
      Object.assign(new Error("cancelled"), { name: "NotAllowedError" })
    );
    const result = await signInWithPasskey(undefined, PASSKEY_OPTIONS);
    expect(result.outcome).toBe("cancelled");
  });

  it("handles user cancellation while fetching options", async () => {
    mocks.options.mockRejectedValue(
      Object.assign(new Error("cancelled"), { name: "NotAllowedError" })
    );
    const result = await signInWithPasskey(undefined, PASSKEY_OPTIONS);
    expect(result.outcome).toBe("cancelled");
  });

  it("rethrows unexpected option fetch failures", async () => {
    mocks.options.mockRejectedValue(new Error("network down"));
    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow("network down");
  });

  it("throws when session sign-in fails after passkey verify", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow(
      "Passkey sign-in could not complete your session."
    );
    expectSensitiveAssertionReleased(sensitive);
  });

  it("releases extension results when server verification throws", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.verify.mockRejectedValueOnce(new Error("verification unavailable"));

    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow(
      "verification unavailable"
    );

    expectSensitiveAssertionReleased(sensitive);
  });

  it("releases extension results when final session creation throws", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.signIn.mockRejectedValueOnce(new Error("session unavailable"));

    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow(
      "session unavailable"
    );

    expectSensitiveAssertionReleased(sensitive);
  });

  it("rethrows unexpected WebAuthn failures", async () => {
    mocks.startAuthentication.mockRejectedValue(new Error("hardware error"));
    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow("hardware error");
  });

  it("exposes unsupported browser copy", () => {
    expect(getPasskeyLoginUnsupportedMessage()).toContain("does not support passkey sign-in");
  });

  it("passes email to options when provided", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({ userId: USER_ID, credentialId: "cred-id" });
    await signInWithPasskey({ email: "user@example.com" }, PASSKEY_OPTIONS);
    expect(mocks.options).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("prepares authentication options and invokes integration only after session creation", async () => {
    const order: string[] = [];
    const prfSalt = new Uint8Array([1, 2, 3, 4]).buffer;
    mocks.signIn.mockImplementation(async () => {
      order.push("session");
      return { ok: true, error: null };
    });
    mocks.startAuthentication.mockResolvedValue({
      id: "cred-id",
      clientExtensionResults: { prf: { results: { first: "browser-only" } } },
    });
    const prepareOptions = vi.fn(async (value) => ({
      ...value,
      extensions: { prf: { eval: { first: prfSalt } } },
    }));
    let observedExtensionResults: unknown;
    const onFullyAuthenticated = vi.fn(async (context) => {
      observedExtensionResults = structuredClone(context.clientExtensionResults);
      order.push("integration");
    });

    const result = await signInWithPasskey(undefined, {
      ...PASSKEY_OPTIONS,
      hooks: { prepareOptions, onFullyAuthenticated },
    });

    expect(mocks.startAuthentication).toHaveBeenCalledWith({
      optionsJSON: {
        challenge: "c",
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    });
    expect(
      mocks.startAuthentication.mock.calls[0]?.[0].optionsJSON.extensions.prf.eval.first
    ).toBe(prfSalt);
    expect(observedExtensionResults).toEqual({
      prf: { results: { first: "browser-only" } },
    });
    expect(order).toEqual(["session", "integration"]);
    expect(result.integration).toEqual({ status: "completed" });
  });

  it("fails closed on a server/browser credential-id mismatch", async () => {
    const sensitive = useSensitiveAssertion();
    mocks.verify.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "token",
      userId: USER_ID,
      credentialId: "different-id",
    });

    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow(
      /credential verification mismatch/
    );
    expect(mocks.signIn).not.toHaveBeenCalled();
    expectSensitiveAssertionReleased(sensitive);
  });

  it("reports optional integration failure without failing account sign-in", async () => {
    const sensitive = useSensitiveAssertion();
    const result = await signInWithPasskey(undefined, {
      ...PASSKEY_OPTIONS,
      hooks: {
        onFullyAuthenticated: () => {
          throw new Error("optional integration failed");
        },
      },
    });

    expect(result.outcome).toBe("signed-in");
    expect(result.integration).toMatchObject({ status: "failed" });
    expectSensitiveAssertionReleased(sensitive);
  });

  it.each([undefined, null, { ok: false, error: null }, { error: null }])(
    "fails closed when NextAuth does not confirm the session: %j",
    async (authResult) => {
      mocks.signIn.mockResolvedValueOnce(authResult);
      const onFullyAuthenticated = vi.fn();

      await expect(
        signInWithPasskey(undefined, {
          ...PASSKEY_OPTIONS,
          hooks: { onFullyAuthenticated },
        })
      ).rejects.toThrow("Passkey sign-in could not complete your session.");

      expect(onFullyAuthenticated).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBeNull();
    }
  );
});
