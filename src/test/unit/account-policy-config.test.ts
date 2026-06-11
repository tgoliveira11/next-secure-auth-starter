import { describe, it, expect, afterEach } from "vitest";
import {
  assertCredentialsEmailVerifiedForSignIn,
  credentialsSignInRequiresEmailVerification,
  DEFAULT_ACCOUNT_POLICY,
  EmailVerificationRequiredError,
  getAccountPolicyConfig,
} from "@/lib/account-policy-config";

describe("account policy config", () => {
  const originalSend = process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER;
  const originalRequire = process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN;

  afterEach(() => {
    if (originalSend === undefined) {
      delete process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER;
    } else {
      process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER = originalSend;
    }
    if (originalRequire === undefined) {
      delete process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN;
    } else {
      process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN = originalRequire;
    }
  });

  it("defaults to sending verification without blocking sign-in", () => {
    delete process.env.EMAIL_VERIFICATION_SEND_ON_REGISTER;
    delete process.env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN;

    expect(getAccountPolicyConfig()).toEqual(DEFAULT_ACCOUNT_POLICY);
  });

  it("reads email verification env flags", () => {
    expect(
      getAccountPolicyConfig({
        EMAIL_VERIFICATION_SEND_ON_REGISTER: "false",
        EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN: "true",
      })
    ).toEqual({
      sendVerificationOnRegister: false,
      requireEmailVerificationBeforeSignIn: true,
    });
  });

  it("does not require verification for sign-in by default", () => {
    expect(
      credentialsSignInRequiresEmailVerification({
        authProvider: "credentials",
        passwordHash: "hash",
        emailVerifiedAt: null,
      })
    ).toBe(false);
  });

  it("requires verification for credentials accounts when configured", () => {
    expect(
      credentialsSignInRequiresEmailVerification(
        {
          authProvider: "credentials",
          passwordHash: "hash",
          emailVerifiedAt: null,
        },
        { EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN: "true" }
      )
    ).toBe(true);
  });

  it("ignores OAuth accounts even when verification is required", () => {
    expect(
      credentialsSignInRequiresEmailVerification(
        {
          authProvider: "google",
          passwordHash: null,
          emailVerifiedAt: null,
        },
        { EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN: "true" }
      )
    ).toBe(false);
  });

  it("throws when credentials sign-in requires verification", () => {
    expect(() =>
      assertCredentialsEmailVerifiedForSignIn(
        {
          authProvider: "credentials",
          passwordHash: "hash",
          emailVerifiedAt: null,
        },
        { EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN: "true" }
      )
    ).toThrow(EmailVerificationRequiredError);
  });

  it("allows verified credentials sign-in when verification is required", () => {
    expect(() =>
      assertCredentialsEmailVerifiedForSignIn(
        {
          authProvider: "credentials",
          passwordHash: "hash",
          emailVerifiedAt: new Date(),
        },
        { EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN: "true" }
      )
    ).not.toThrow();
  });
});
