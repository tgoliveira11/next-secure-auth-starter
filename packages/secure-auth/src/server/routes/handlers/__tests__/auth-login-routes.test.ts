import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginVerify2faOauthPost as verifyOAuthPost,
  twoFactorBackupCodesPost as regeneratePost,
} from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
  isEnabledForUser: vi.fn(),
  verifyOAuthTwoFactor: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    getSessionUser: mocks.getSessionUser,
    requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  };
});

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    authLoginService: {
      ...base.authLoginService,
      verifyOAuthTwoFactor: mocks.verifyOAuthTwoFactor,
    },
    twoFactorService: {
      ...base.twoFactorService,
      isEnabledForUser: mocks.isEnabledForUser,
      regenerateBackupCodes: mocks.regenerateBackupCodes,
    },
  }));
}

describe("auth login and backup code API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.isEnabledForUser.mockResolvedValue(true);
    services = await buildServices();
  });

  it("verify-2fa-oauth returns upgrade token", async () => {
    mocks.verifyOAuthTwoFactor.mockResolvedValue({ upgradeToken: "upgrade-token" });
    const res = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
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
      }),
      services
    );
    expect(noSession.status).toBe(401);

    mocks.isEnabledForUser.mockResolvedValueOnce(false);
    const disabled = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    expect(disabled.status).toBe(400);

    const invalid = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "12" }),
      }),
      services
    );
    expect(invalid.status).toBe(400);
  });

  it("verify-2fa-oauth maps invalid authenticator codes", async () => {
    const { InvalidTwoFactorCodeError } = await import("@/modules/auth/services/auth-login-service");
    mocks.verifyOAuthTwoFactor.mockRejectedValue(new InvalidTwoFactorCodeError());
    const res = await verifyOAuthPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    expect(res.status).toBe(401);
  });

  it("backup code regeneration returns codes once", async () => {
    mocks.regenerateBackupCodes.mockResolvedValue({ backupCodes: ["AAAA-BBBB-CCCC"] });
    const res = await regeneratePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ backupCodes: ["AAAA-BBBB-CCCC"] });
  });

  it("backup code regeneration rejects invalid payloads", async () => {
    const res = await regeneratePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "12" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });
});
