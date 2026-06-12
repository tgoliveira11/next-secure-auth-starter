import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  twoFactorStatusGet,
  sessionsPingPost,
  sessionsRevokeAllPost as revokeAllPost,
  sessionsRevokeCurrentPost as revokeCurrentPost,
  passkeysListGet as passkeysGet,
  passkeyDelete,
  accountGet,
  twoFactorBackupCodesPost as regeneratePost,
} from "@/test/helpers/handlers";
import {
  twoFactorSetupStartPost as setupStartPost,
  twoFactorDisablePost as disablePost,
} from "@/test/helpers/handlers";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  requireSessionUser: vi.fn(),
  getStatus: vi.fn(),
  startSetup: vi.fn(),
  disable: vi.fn(),
  pingSession: vi.fn(),
  revokeAllSessions: vi.fn(),
  revokeCurrentSession: vi.fn(),
  listPasskeys: vi.fn(),
  removePasskey: vi.fn(),
  getDeletionRequirements: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
    requireSessionUser: mocks.requireSessionUser,
  };
});

vi.mock("@/modules/two-factor/services/two-factor-service", () => ({
  twoFactorService: {
    getStatus: mocks.getStatus,
    startSetup: mocks.startSetup,
    disable: mocks.disable,
    regenerateBackupCodes: mocks.regenerateBackupCodes,
  },
}));

vi.mock("@/modules/sessions/services/account-session-service", () => ({
  accountSessionService: {
    enrichFromRequest: mocks.pingSession,
    revokeAllSessions: mocks.revokeAllSessions,
    revokeCurrentSession: mocks.revokeCurrentSession,
  },
}));

vi.mock("@/modules/passkeys/services/passkey-account-service", () => ({
  passkeyAccountService: {
    listPasskeys: mocks.listPasskeys,
    removePasskey: mocks.removePasskey,
  },
}));

vi.mock("@/modules/account/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: mocks.getDeletionRequirements,
  },
}));

describe("API route error branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("maps unexpected two-factor route failures", async () => {
    mocks.getStatus.mockRejectedValue(new Error("db down"));
    expect((await twoFactorStatusGet()).status).toBeGreaterThanOrEqual(400);

    mocks.startSetup.mockRejectedValue(new Error("db down"));
    expect((await setupStartPost(new Request("http://localhost"))).status).toBeGreaterThanOrEqual(400);

    mocks.disable.mockRejectedValue(new Error("db down"));
    expect(
      (await disablePost(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ code: "123456" }),
        })
      )).status
    ).toBeGreaterThanOrEqual(400);

    mocks.regenerateBackupCodes.mockRejectedValue(new Error("db down"));
    expect(
      (await regeneratePost(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ code: "123456" }),
        })
      )).status
    ).toBeGreaterThanOrEqual(400);
  });

  it("maps unexpected session and passkey route failures", async () => {
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: "session-id",
    });
    mocks.pingSession.mockRejectedValue(new Error("db down"));
    expect((await sessionsPingPost(new Request("http://localhost"))).status).toBe(500);

    mocks.revokeAllSessions.mockRejectedValue(new Error("db down"));
    expect((await revokeAllPost(new Request("http://localhost"))).status).toBe(500);

    mocks.revokeCurrentSession.mockRejectedValue(new Error("db down"));
    expect(
      (await revokeCurrentPost(new Request("http://localhost"))).status
    ).toBe(500);

    mocks.listPasskeys.mockRejectedValue(new Error("db down"));
    expect((await passkeysGet()).status).toBe(500);

    mocks.removePasskey.mockRejectedValue(new Error("db down"));
    expect(
      (
        await passkeyDelete(new Request("http://localhost"), {
          params: Promise.resolve({ id: "pk-1" }),
        })
      ).status
    ).toBe(500);
  });

  it("maps unexpected account route failures", async () => {
    mocks.getDeletionRequirements.mockRejectedValue(new Error("db down"));
    expect((await accountGet()).status).toBe(500);
  });
});