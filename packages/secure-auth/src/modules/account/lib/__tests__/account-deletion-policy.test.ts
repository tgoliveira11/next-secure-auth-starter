import { describe, it, expect } from "vitest";
import {
  ACCOUNT_DELETION_REAUTH_WINDOW_MS,
  assertPasswordlessDeletionAllowed,
  mapUserAuthProviderToSessionMethod,
} from "../account-deletion-policy";
import { ReauthenticationRequiredError } from "../account-errors";

function session(overrides: Partial<{
  authMethod: string;
  lastUsedAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  expiresAt: Date;
}> = {}) {
  const now = new Date();
  return {
    authMethod: "google",
    lastUsedAt: now,
    createdAt: now,
    revokedAt: null,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    ...overrides,
  };
}

describe("account deletion policy", () => {
  it("maps OAuth providers to session auth methods", () => {
    expect(mapUserAuthProviderToSessionMethod("google")).toBe("google");
    expect(mapUserAuthProviderToSessionMethod("github")).toBe("github");
    expect(mapUserAuthProviderToSessionMethod("azure-ad")).toBe("microsoft");
  });

  it("skips passwordless checks when password is set", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: "hash" },
        accountSession: null,
      })
    ).not.toThrow();
  });

  it("requires account session id for OAuth-only users", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: null },
        accountSession: session(),
      })
    ).toThrow(ReauthenticationRequiredError);
  });

  it("allows OAuth-only deletion with matching fresh OAuth session", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "google" }),
      })
    ).not.toThrow();
  });

  it("rejects OAuth-only deletion when session auth method mismatches provider", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "passkey" }),
      })
    ).toThrow(/original sign-in method/i);
  });

  it("rejects stale sessions outside re-auth window", () => {
    const stale = new Date(Date.now() - ACCOUNT_DELETION_REAUTH_WINDOW_MS - 1000);
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "apple", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "apple", lastUsedAt: stale, createdAt: stale }),
      })
    ).toThrow(/recent sign-in/i);
  });

  it("rejects revoked sessions", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ revokedAt: new Date() }),
      })
    ).toThrow(/no longer valid/i);
  });

  it("requires passkey session for passwordless credentials accounts", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "credentials", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "passkey" }),
      })
    ).not.toThrow();

    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "credentials", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "password" }),
      })
    ).toThrow(/passkey/i);
  });
});