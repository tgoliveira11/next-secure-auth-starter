/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { passkeyLoginApi } from "../api-client/passkey-login.js";
import { signInWithPasskey } from "./sign-in-with-passkey.js";

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("../api-client/passkey-login.js", () => ({
  passkeyLoginApi: {
    options: vi.fn(),
    verify: vi.fn(),
  },
}));

function buildAssertion(prfOutput = new Uint8Array([4, 5, 6]).buffer) {
  return {
    id: "credential-1",
    rawId: "credential-1",
    type: "public-key" as const,
    response: {
      clientDataJSON: "client-data",
      authenticatorData: "authenticator-data",
      signature: "signature",
    },
    clientExtensionResults: {
      prf: { results: { first: prfOutput } },
    },
  };
}

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

describe("signInWithPasskey integration outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
    document.cookie = "test-app-passkey-login-user-id=; max-age=0; path=/";
    document.cookie = "test-app-passkey-login-credential-id=; max-age=0; path=/";
    Object.defineProperty(window, "PublicKeyCredential", {
      configurable: true,
      value: { isUserVerifyingPlatformAuthenticatorAvailable: vi.fn() },
    });
    vi.mocked(passkeyLoginApi.options).mockResolvedValue({
      options: {
        challenge: "challenge",
        rpId: "example.com",
        userVerification: "required",
        extensions: {
          prf: { eval: { first: "base64url-salt" } },
        } as never,
      },
    });
    vi.mocked(passkeyLoginApi.verify).mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token",
      userId: "user-1",
      credentialId: "credential-1",
    });
    vi.mocked(signIn).mockResolvedValue({ ok: true, error: null } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes server-composed extensions through browser preparation", async () => {
    const assertion = buildAssertion();
    vi.mocked(startAuthentication).mockResolvedValue(assertion as never);
    const prepareOptions = vi.fn((options) => options);

    const result = await signInWithPasskey(
      { email: "person@example.com" },
      {
        appSlug: "test-app",
        hooks: { prepareOptions, onFullyAuthenticated: vi.fn() },
      }
    );

    expect(prepareOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: { prf: { eval: { first: "base64url-salt" } } },
      })
    );
    expect(startAuthentication).toHaveBeenCalledWith({
      optionsJSON: expect.objectContaining({
        extensions: { prf: { eval: { first: "base64url-salt" } } },
      }),
    });
    expect(result).toMatchObject({
      outcome: "signed-in",
      integration: { status: "completed" },
    });
  });

  it("returns a typed action and its redirect instead of hiding an incomplete integration", async () => {
    const prfOutput = new Uint8Array([9, 8, 7]).buffer;
    vi.mocked(startAuthentication).mockResolvedValue(buildAssertion(prfOutput) as never);

    const result = await signInWithPasskey(
      { email: "person@example.com" },
      {
        appSlug: "test-app",
        afterLoginPath: "/dashboard",
        hooks: {
          onFullyAuthenticated: () => ({
            status: "action_required",
            code: "local_capability_no_match",
            redirectTo: "/unlock?reason=no-match",
          }),
        },
      }
    );

    expect(result).toEqual({
      outcome: "signed-in-integration-action-required",
      redirectTo: "/unlock?reason=no-match",
      integration: {
        status: "action_required",
        code: "local_capability_no_match",
        redirectTo: "/unlock?reason=no-match",
      },
    });
    expect([...new Uint8Array(prfOutput)]).toEqual([0, 0, 0]);
  });

  it("reports unexpected integration failures after account sign-in", async () => {
    vi.mocked(startAuthentication).mockResolvedValue(buildAssertion() as never);

    const result = await signInWithPasskey(
      { email: "person@example.com" },
      {
        appSlug: "test-app",
        afterLoginPath: "/dashboard",
        hooks: {
          onFullyAuthenticated: () => {
            throw new Error("consumer integration failed");
          },
        },
      }
    );

    expect(result).toMatchObject({
      outcome: "signed-in-integration-failed",
      redirectTo: "/dashboard",
      integration: { status: "failed" },
    });
  });

  it("does not retain or invoke browser integration across pending TOTP", async () => {
    const prfOutput = new Uint8Array([3, 2, 1]).buffer;
    const onFullyAuthenticated = vi.fn();
    vi.mocked(startAuthentication).mockResolvedValue(buildAssertion(prfOutput) as never);
    vi.mocked(passkeyLoginApi.verify).mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "server-only-cookie-token",
      userId: "user-1",
      credentialId: "credential-1",
    });

    const result = await signInWithPasskey(
      { email: "person@example.com" },
      {
        appSlug: "test-app",
        hooks: { onFullyAuthenticated },
      }
    );

    expect(result.outcome).toBe("requires-two-factor");
    expect(onFullyAuthenticated).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
    expect([...new Uint8Array(prfOutput)]).toEqual([0, 0, 0]);
  });

  it("fails a consumer-supplied cross-origin action redirect", async () => {
    vi.mocked(startAuthentication).mockResolvedValue(buildAssertion() as never);

    const result = await signInWithPasskey(
      { email: "person@example.com" },
      {
        appSlug: "test-app",
        hooks: {
          onFullyAuthenticated: () => ({
            status: "action_required",
            code: "retry",
            redirectTo: "https://attacker.example",
          }),
        },
      }
    );

    expect(result).toMatchObject({
      outcome: "signed-in-integration-failed",
      integration: { status: "failed" },
    });
  });
});
