import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyCaptcha, verifyTurnstileToken } from "@/modules/captcha/services/turnstile-verifier";
import { CaptchaVerificationError } from "@/modules/captcha/errors";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

const captchaConfig = buildTestSecureAuthConfig({
  captcha: {
    enabled: true,
    provider: "turnstile",
    siteKey: "site-key",
    secretKey: "secret-key",
    pages: { register: true, login: true },
  },
});

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when siteverify succeeds", async () => {
    await expect(
      verifyTurnstileToken({ secretKey: "secret-key", token: "token-123" })
    ).resolves.toBe(true);
  });

  it("returns false when siteverify rejects token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      })
    );

    await expect(
      verifyTurnstileToken({ secretKey: "secret-key", token: "bad-token" })
    ).resolves.toBe(false);
  });

  it("returns false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(
      verifyTurnstileToken({ secretKey: "secret-key", token: "token-123" })
    ).resolves.toBe(false);
  });

  it("returns false on malformed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("invalid json");
        },
      })
    );

    await expect(
      verifyTurnstileToken({ secretKey: "secret-key", token: "token-123" })
    ).resolves.toBe(false);
  });
});

describe("verifyCaptcha", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips validation when flow is disabled", async () => {
    await expect(
      verifyCaptcha({
        config: buildTestSecureAuthConfig(),
        token: undefined,
        action: "register",
      })
    ).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects missing token when required", async () => {
    await expect(
      verifyCaptcha({
        config: captchaConfig,
        token: "",
        action: "register",
      })
    ).rejects.toBeInstanceOf(CaptchaVerificationError);
  });

  it("proceeds when token is valid", async () => {
    await expect(
      verifyCaptcha({
        config: captchaConfig,
        token: "valid-token",
        action: "login",
      })
    ).resolves.toBeUndefined();
  });
});
