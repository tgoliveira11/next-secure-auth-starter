import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import {
  hasEmailVerificationRequiredJwt,
  hasEmailVerificationRequiredSession,
  hasPendingTwoFactorJwt,
  hasPendingTwoFactorSession,
  isFullyAuthenticatedJwt,
  isFullyAuthenticatedSession,
} from "../session-auth-state";

describe("session auth state helpers", () => {
  const baseSession = {
    user: { id: "user-1", email: "user@example.com" },
    expires: "2099-01-01T00:00:00.000Z",
    twoFactorVerified: true,
    twoFactorPending: false,
    emailVerificationRequired: false,
  } satisfies Session;

  it("detects fully authenticated sessions", () => {
    expect(isFullyAuthenticatedSession("authenticated", baseSession)).toBe(true);
    expect(isFullyAuthenticatedSession("loading", baseSession)).toBe(false);
    expect(isFullyAuthenticatedSession("authenticated", null)).toBe(false);
    expect(
      isFullyAuthenticatedSession("authenticated", {
        ...baseSession,
        twoFactorPending: true,
      })
    ).toBe(false);
    expect(
      isFullyAuthenticatedSession("authenticated", {
        ...baseSession,
        twoFactorVerified: false,
      })
    ).toBe(false);
    expect(
      isFullyAuthenticatedSession("authenticated", {
        ...baseSession,
        emailVerificationRequired: true,
      })
    ).toBe(false);
  });

  it("detects pending 2FA and email verification sessions", () => {
    expect(
      hasPendingTwoFactorSession("authenticated", { ...baseSession, twoFactorPending: true })
    ).toBe(true);
    expect(
      hasEmailVerificationRequiredSession("authenticated", {
        ...baseSession,
        emailVerificationRequired: true,
      })
    ).toBe(true);
  });

  it("evaluates JWT auth state flags", () => {
    expect(isFullyAuthenticatedJwt({ sub: "user-1", twoFactorVerified: true })).toBe(true);
    expect(isFullyAuthenticatedJwt(null)).toBe(false);
    expect(isFullyAuthenticatedJwt({ sub: "user-1", sessionInvalidated: true })).toBe(false);
    expect(
      isFullyAuthenticatedJwt({
        sub: "user-1",
        twoFactorPending: true,
        twoFactorVerified: false,
      })
    ).toBe(false);
    expect(
      isFullyAuthenticatedJwt({ sub: "user-1", emailVerificationRequired: true })
    ).toBe(false);
    expect(
      hasPendingTwoFactorJwt({ twoFactorPending: true, twoFactorVerified: false })
    ).toBe(true);
    expect(hasEmailVerificationRequiredJwt({ emailVerificationRequired: true })).toBe(true);
  });
});
