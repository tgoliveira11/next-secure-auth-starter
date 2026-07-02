import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getPendingTwoFactorLoginEmail: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("@/modules/auth/lib/pending-two-factor-login-email.js", () => ({
  getPendingTwoFactorLoginEmail: mocks.getPendingTwoFactorLoginEmail,
}));

vi.mock("@/modules/auth/lib/session.js", () => ({
  getSessionUser: mocks.getSessionUser,
}));

import { getLoginTwoFactorInitialUsernameEmail } from "@/next/get-login-two-factor-initial-username-email";

describe("getLoginTwoFactorInitialUsernameEmail", () => {
  const services = {} as SecureAuthServices;
  const getServices = vi.fn(async () => services);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPendingTwoFactorLoginEmail.mockResolvedValue(undefined);
    mocks.getSessionUser.mockResolvedValue(null);
  });

  it("prefers the credentials challenge email", async () => {
    mocks.getPendingTwoFactorLoginEmail.mockResolvedValue("user@example.com");

    await expect(getLoginTwoFactorInitialUsernameEmail(getServices)).resolves.toBe(
      "user@example.com"
    );
    expect(mocks.getSessionUser).not.toHaveBeenCalled();
  });

  it("falls back to pending oauth session email", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      email: "oauth@example.com",
      twoFactorPending: true,
      twoFactorVerified: false,
      emailVerificationRequired: false,
    });

    await expect(getLoginTwoFactorInitialUsernameEmail(getServices)).resolves.toBe(
      "oauth@example.com"
    );
  });

  it("returns undefined when no pending challenge or oauth session email exists", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "user-1",
      email: "",
      twoFactorPending: true,
      twoFactorVerified: false,
      emailVerificationRequired: false,
    });

    await expect(getLoginTwoFactorInitialUsernameEmail(getServices)).resolves.toBeUndefined();
  });
});
