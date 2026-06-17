import { describe, it, expect } from "vitest";
import {
  buildPublicCaptchaConfig,
  isCaptchaRequiredForFlow,
  resolveCaptchaConfig,
  validateCaptchaConfig,
} from "@/modules/captcha/lib/captcha-config";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

describe("captcha config", () => {
  it("defaults to disabled", () => {
    const resolved = resolveCaptchaConfig(buildTestSecureAuthConfig());
    expect(resolved).toEqual({
      enabled: false,
      provider: "turnstile",
      siteKey: "",
      secretKey: "",
      pages: { register: false, login: false },
    });
    expect(isCaptchaRequiredForFlow(buildTestSecureAuthConfig(), "register")).toBe(false);
    expect(isCaptchaRequiredForFlow(buildTestSecureAuthConfig(), "login")).toBe(false);
    expect(buildPublicCaptchaConfig(buildTestSecureAuthConfig())).toBeUndefined();
  });

  it("enforces register and login independently", () => {
    const config = buildTestSecureAuthConfig({
      captcha: {
        enabled: true,
        provider: "turnstile",
        siteKey: "site-key",
        secretKey: "secret-key",
        pages: { register: true, login: false },
      },
    });

    expect(isCaptchaRequiredForFlow(config, "register")).toBe(true);
    expect(isCaptchaRequiredForFlow(config, "login")).toBe(false);
    expect(buildPublicCaptchaConfig(config)).toEqual({
      provider: "turnstile",
      siteKey: "site-key",
      pages: { register: true, login: false },
    });
  });

  it("fails fast when enabled without keys", () => {
    expect(() =>
      validateCaptchaConfig(
        buildTestSecureAuthConfig({
          captcha: { enabled: true, pages: { register: true } },
        })
      )
    ).toThrow(/siteKey and captcha.secretKey/);
  });

  it("allows disabled config without keys", () => {
    expect(() =>
      validateCaptchaConfig(
        buildTestSecureAuthConfig({
          captcha: { enabled: false },
        })
      )
    ).not.toThrow();
  });

  it("does not expose secretKey in public config", () => {
    const publicConfig = buildPublicCaptchaConfig(
      buildTestSecureAuthConfig({
        captcha: {
          enabled: true,
          siteKey: "site-key",
          secretKey: "secret-key",
          pages: { login: true },
        },
      })
    );

    expect(publicConfig).toBeDefined();
    expect(publicConfig).not.toHaveProperty("secretKey");
    expect(JSON.stringify(publicConfig)).not.toContain("secret-key");
  });
});
