import { describe, it, expect } from "vitest";
import {
  evaluateOAuthSignIn,
  getOAuthSignInErrorMessage,
  isOAuthOnlyProvider,
  oauthSignInRedirectPath,
  OAUTH_SIGN_IN_ERROR_CODES,
} from "../oauth-sign-in-policy";

describe("oauth sign-in policy", () => {
  it("creates users for new OAuth emails", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "google",
      existingUser: null,
    });
    expect(result).toEqual({ action: "create_user", authProvider: "google" });
  });

  it("creates users for new GitHub OAuth emails", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "github",
      existingUser: null,
    });
    expect(result).toEqual({ action: "create_user", authProvider: "github" });
  });

  it("rejects OAuth when email is missing", () => {
    const result = evaluateOAuthSignIn({
      email: null,
      accountProvider: "azure-ad",
      existingUser: null,
    });
    expect(result.action).toBe("reject");
  });

  it("rejects provider mismatch for existing accounts", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "google",
      existingUser: { authProvider: "apple", emailVerifiedAt: new Date() },
    });
    expect(result.action).toBe("reject");
    if (result.action === "reject") {
      expect(result.redirectPath).toContain(OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS);
    }
  });

  it("allows existing OAuth user with same provider", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "apple",
      existingUser: { authProvider: "apple", emailVerifiedAt: null },
    });
    expect(result).toEqual({ action: "allow_existing", markEmailVerified: true });
  });

  it("identifies OAuth-only providers", () => {
    expect(isOAuthOnlyProvider("google")).toBe(true);
    expect(isOAuthOnlyProvider("credentials")).toBe(false);
  });

  it("allows existing user flow for login-token provider", () => {
    expect(
      evaluateOAuthSignIn({
        email: "user@example.com",
        accountProvider: "login-token",
        existingUser: { authProvider: "credentials", emailVerifiedAt: new Date() },
      })
    ).toEqual({ action: "allow_existing", markEmailVerified: false });
    expect(
      evaluateOAuthSignIn({
        email: "user@example.com",
        accountProvider: null,
        existingUser: null,
      })
    ).toEqual({ action: "allow_existing", markEmailVerified: false });
  });

  it("returns safe OAuth error messages", () => {
    expect(getOAuthSignInErrorMessage(OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS)).toMatch(
      /already exists/i
    );
    expect(getOAuthSignInErrorMessage("OAuthCallback")).toMatch(/redirect/i);
    expect(getOAuthSignInErrorMessage("OAuthSignin")).toMatch(/Microsoft/);
    expect(getOAuthSignInErrorMessage(OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED)).toMatch(/email/i);
    expect(oauthSignInRedirectPath(OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED)).toBe(
      "/login?error=OAuthEmailRequired"
    );
    expect(getOAuthSignInErrorMessage("UnknownProviderError")).toMatch(/could not be completed/i);
    expect(getOAuthSignInErrorMessage(null)).toBeNull();
  });
});