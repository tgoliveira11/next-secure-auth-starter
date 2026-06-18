import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import {
  requireFullyAuthenticatedUser,
  requireSessionUser,
  requireVerifiedFullyAuthenticatedUser,
  UnauthorizedError,
  AccountEmailVerificationRequiredError,
} from "@/modules/auth/lib/session";
import { createTestSecureAuth } from "@/test/helpers/create-test-secure-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const getServerSessionMock = vi.mocked(getServerSession);

describe("session auth tiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function services() {
    return createTestSecureAuth().getServices();
  }

  it("requireSessionUser allows pending 2FA", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", email: "a@example.com" },
      twoFactorVerified: false,
      twoFactorPending: true,
      emailVerificationRequired: false,
    } as never);
    const user = await requireSessionUser(await services());
    expect(user.id).toBe("u1");
    expect(user.twoFactorPending).toBe(true);
  });

  it("requireFullyAuthenticatedUser rejects pending 2FA", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", email: "a@example.com" },
      twoFactorVerified: false,
      twoFactorPending: true,
    } as never);
    await expect(requireFullyAuthenticatedUser(await services())).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("requireVerifiedFullyAuthenticatedUser rejects unverified email when policy requires it", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", email: "a@example.com" },
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: true,
    } as never);
    const svc = await createTestSecureAuth({
      accountPolicy: {
        sendVerificationOnRegister: true,
        requireEmailVerificationBeforeSignIn: false,
        requireEmailVerificationForAccountApis: true,
      },
    }).getServices();
    await expect(requireVerifiedFullyAuthenticatedUser(svc)).rejects.toBeInstanceOf(
      AccountEmailVerificationRequiredError
    );
  });

  it("requireVerifiedFullyAuthenticatedUser allows unverified email when policy disabled", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", email: "a@example.com" },
      twoFactorVerified: true,
      twoFactorPending: false,
      emailVerificationRequired: true,
    } as never);
    const svc = await createTestSecureAuth({
      accountPolicy: {
        sendVerificationOnRegister: true,
        requireEmailVerificationBeforeSignIn: false,
        requireEmailVerificationForAccountApis: false,
      },
    }).getServices();
    const user = await requireVerifiedFullyAuthenticatedUser(svc);
    expect(user.id).toBe("u1");
  });
});
