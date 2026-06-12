import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginVerify2faOauthPost as verifyOAuthPost,
  twoFactorBackupCodesPost as regeneratePost,
} from "@/test/helpers/handlers";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
  isEnabledForUser: vi.fn(),
  verifyOAuthTwoFactor: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    getSessionUser: mocks.getSessionUser,
    requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  };
});

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    isEnabledForUser: mocks.isEnabledForUser,
    regenerateBackupCodes: mocks.regenerateBackupCodes,
  },
}));

vi.mock("@/server/services/auth-login-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/auth-login-service")>();
  return {
    ...actual,
    authLoginService: {
      ...actual.authLoginService,
      verifyOAuthTwoFactor: mocks.verifyOAuthTwoFactor,
    },
  };
});

describe("auth login and backup code API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.isEnabledForUser.mockResolvedValue(true);
  });

  it("verify-2fa-oauth returns upgrade token", async () => {
    mocks.verifyOAuthTwoFactor.mockResolvedValue({ upgradeToken: "upgrade-token" });
    const res = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ upgradeToken: "upgrade-token" });
  });

  it("verify-2fa-oauth rejects missing session and invalid payloads", async () => {
    mocks.getSessionUser.mockResolvedValueOnce(null);
    const noSession = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(noSession.status).toBe(401);

    mocks.isEnabledForUser.mockResolvedValueOnce(false);
    const disabled = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(disabled.status).toBe(400);

    const invalid = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "12" }),
      })
    );
    expect(invalid.status).toBe(400);
  });

  it("verify-2fa-oauth maps invalid authenticator codes", async () => {
    const { InvalidTwoFactorCodeError } = await import("@/server/services/auth-login-service");
    mocks.verifyOAuthTwoFactor.mockRejectedValue(new InvalidTwoFactorCodeError());
    const res = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("backup code regeneration returns codes once", async () => {
    mocks.regenerateBackupCodes.mockResolvedValue({ backupCodes: ["AAAA-BBBB-CCCC"] });
    const res = await regeneratePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ backupCodes: ["AAAA-BBBB-CCCC"] });
  });

  it("backup code regeneration rejects invalid payloads", async () => {
    const res = await regeneratePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "12" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
