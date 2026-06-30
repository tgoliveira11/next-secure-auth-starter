import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import {
  AccountEmailVerificationRequiredError,
  getSessionUser,
  requireFullyAuthenticatedUser,
  requireVerifiedFullyAuthenticatedUser,
  UnauthorizedError,
} from "../session";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

let services: SecureAuthServices;

describe("session helpers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    services = await getTestServices();
  });

  it("requireFullyAuthenticatedUser rejects pending 2FA sessions", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      twoFactorVerified: false,
      twoFactorPending: true,
    });
    await expect(requireFullyAuthenticatedUser(services)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireVerifiedFullyAuthenticatedUser rejects unverified email when required", async () => {
    services = await getTestServices({
      auth: { ...services.config.auth, requireEmailVerificationBeforeSignIn: true },
    });
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: true,
    });
    await expect(requireVerifiedFullyAuthenticatedUser(services)).rejects.toBeInstanceOf(
      AccountEmailVerificationRequiredError
    );
  });

  it("getSessionUser maps session flags", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      accountSessionId: "session-1",
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: false,
    });
    await expect(getSessionUser(services)).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      accountSessionId: "session-1",
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: false,
    });
  });
});
