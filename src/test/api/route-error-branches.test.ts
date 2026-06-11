import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as twoFactorStatusGet } from "@/app/api/account/2fa/status/route";
import { POST as setupStartPost } from "@/app/api/account/2fa/setup/start/route";
import { POST as disablePost } from "@/app/api/account/2fa/disable/route";
import { POST as sessionsPingPost } from "@/app/api/account/sessions/ping/route";
import { POST as revokeAllPost } from "@/app/api/account/sessions/revoke-all/route";
import { POST as revokeCurrentPost } from "@/app/api/account/sessions/revoke-current/route";
import { GET as passkeysGet } from "@/app/api/account/passkeys/route";
import { DELETE as passkeyDelete } from "@/app/api/account/passkeys/[id]/route";
import { GET as accountGet } from "@/app/api/account/route";
import { POST as regeneratePost } from "@/app/api/account/2fa/backup-codes/regenerate/route";
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

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
    requireSessionUser: mocks.requireSessionUser,
  };
});

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    getStatus: mocks.getStatus,
    startSetup: mocks.startSetup,
    disable: mocks.disable,
    regenerateBackupCodes: mocks.regenerateBackupCodes,
  },
}));

vi.mock("@/server/services/account-session-service", () => ({
  accountSessionService: {
    enrichFromRequest: mocks.pingSession,
    revokeAllSessions: mocks.revokeAllSessions,
    revokeCurrentSession: mocks.revokeCurrentSession,
  },
}));

vi.mock("@/server/services/passkey-account-service", () => ({
  passkeyAccountService: {
    listPasskeys: mocks.listPasskeys,
    removePasskey: mocks.removePasskey,
  },
}));

vi.mock("@/server/services/account-service", () => ({
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
