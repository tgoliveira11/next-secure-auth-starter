import { describe, it, expect } from "vitest";
import { createSecureAuth } from "@/next/create-secure-auth";
import { buildTestSecureAuthConfig } from "./helpers/create-test-secure-auth";

describe("createSecureAuth captcha validation", () => {
  it("throws when captcha is enabled without keys", () => {
    expect(() =>
      createSecureAuth(
        buildTestSecureAuthConfig({
          captcha: { enabled: true, pages: { register: true } },
        })
      )
    ).toThrow(/siteKey and captcha.secretKey/);
  });

  it("initializes when captcha is disabled", () => {
    expect(() => createSecureAuth(buildTestSecureAuthConfig())).not.toThrow();
  });
});
