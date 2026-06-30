import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  accountApisRequireEmailVerification,
  assertCredentialsEmailVerifiedForSignIn,
  credentialsSignInRequiresEmailVerification,
  EmailVerificationRequiredError,
  isCredentialsAccount,
} from "../account-policy-config";

describe("account policy config", () => {
  const basePolicy = buildTestSecureAuthConfig().accountPolicy!;

  it("detects credentials accounts", () => {
    expect(
      isCredentialsAccount({ authProvider: "credentials", passwordHash: "hash" })
    ).toBe(true);
    expect(
      isCredentialsAccount({ authProvider: "azure-ad", passwordHash: "hash" })
    ).toBe(false);
  });

  it("requires email verification for credentials sign-in when configured", () => {
    const config = buildTestSecureAuthConfig({
      accountPolicy: {
        ...basePolicy,
        requireEmailVerificationBeforeSignIn: true,
      },
    });
    const user = {
      authProvider: "credentials",
      passwordHash: "hash",
      emailVerifiedAt: null,
    };
    expect(credentialsSignInRequiresEmailVerification(user, config)).toBe(true);
    expect(() => assertCredentialsEmailVerifiedForSignIn(user, config)).toThrow(
      EmailVerificationRequiredError
    );
    expect(
      credentialsSignInRequiresEmailVerification(
        { ...user, emailVerifiedAt: new Date() },
        config
      )
    ).toBe(false);
    expect(
      credentialsSignInRequiresEmailVerification(
        { authProvider: "azure-ad", passwordHash: null, emailVerifiedAt: null },
        config
      )
    ).toBe(false);
  });

  it("defaults account API verification requirement to true", () => {
    expect(accountApisRequireEmailVerification(buildTestSecureAuthConfig())).toBe(true);
    const disabled = buildTestSecureAuthConfig({
      accountPolicy: {
        ...basePolicy,
        requireEmailVerificationForAccountApis: false,
      },
    });
    expect(accountApisRequireEmailVerification(disabled)).toBe(false);
  });
});
