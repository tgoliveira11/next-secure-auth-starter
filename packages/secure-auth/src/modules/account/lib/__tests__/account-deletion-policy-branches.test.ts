import { describe, it, expect } from "vitest";
import {
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

describe("account deletion policy branches", () => {
  it("maps additional OAuth providers", () => {
    expect(mapUserAuthProviderToSessionMethod("apple")).toBe("apple");
    expect(mapUserAuthProviderToSessionMethod("microsoft")).toBe("microsoft");
    expect(mapUserAuthProviderToSessionMethod("unknown-provider")).toBeNull();
  });

  it("rejects expired sessions", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "google", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ expiresAt: new Date(Date.now() - 1000) }),
      })
    ).toThrow(ReauthenticationRequiredError);
  });

  it("rejects OAuth-only deletion when provider cannot be mapped", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "custom-oauth", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "unknown" }),
      })
    ).toThrow(/sign-in provider/i);
  });

  it("rejects unsupported auth providers", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "magic-link", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "unknown" }),
      })
    ).toThrow(/re-authentication/i);
  });

  it("allows apple OAuth deletion with matching session", () => {
    expect(() =>
      assertPasswordlessDeletionAllowed({
        user: { authProvider: "apple", passwordHash: null },
        accountSessionId: "sess-1",
        accountSession: session({ authMethod: "apple" }),
      })
    ).not.toThrow();
  });
});
