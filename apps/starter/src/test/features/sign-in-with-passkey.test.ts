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

vi.mock("@tgoliveira/secure-auth/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/secure-auth/client")>();
  return {
    ...actual,
    passkeyLoginApi: {
      options: mocks.options,
      verify: mocks.verify,
    },
    prepareAuthenticationOptions: (options: unknown) => options,
    getPasskeyLoginHint: mocks.getPasskeyLoginHint,
    setPasskeyLoginHint: mocks.setPasskeyLoginHint,
  };
});

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
      id: "cred",
      clientExtensionResults: {},
    });
    mocks.verify.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    mocks.signIn.mockResolvedValue({ error: null });
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
    mocks.verify.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    const result = await signInWithPasskey(undefined, {
      ...PASSKEY_OPTIONS,
      loginTwoFactorPath: "/login/2fa?mode=credentials",
    });
    expect(result.outcome).toBe("requires-two-factor");
    expect(result.redirectTo).toBe("/login/2fa?mode=credentials");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("signs in and routes to dashboard", async () => {
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
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
    await expect(signInWithPasskey(undefined, PASSKEY_OPTIONS)).rejects.toThrow(
      "Passkey sign-in could not complete your session."
    );
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
});
