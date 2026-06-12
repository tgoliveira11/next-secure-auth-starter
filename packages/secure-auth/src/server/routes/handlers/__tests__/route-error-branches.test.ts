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
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import type { SecureAuthServices } from "@/core/types";

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

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    twoFactorService: {
      ...base.twoFactorService,
      getStatus: mocks.getStatus,
      startSetup: mocks.startSetup,
      disable: mocks.disable,
      regenerateBackupCodes: mocks.regenerateBackupCodes,
    },
    accountSessionService: {
      ...base.accountSessionService,
      enrichFromRequest: mocks.pingSession,
      revokeAllSessions: mocks.revokeAllSessions,
      revokeCurrentSession: mocks.revokeCurrentSession,
    },
    passkeyAccountService: {
      ...base.passkeyAccountService,
      listPasskeys: mocks.listPasskeys,
      removePasskey: mocks.removePasskey,
    },
    accountService: {
      ...base.accountService,
      getDeletionRequirements: mocks.getDeletionRequirements,
    },
  }));
}

describe("API route error branches", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    services = await buildServices();
  });

  it("maps unexpected two-factor route failures", async () => {
    mocks.getStatus.mockRejectedValue(new Error("db down"));
    expect((await twoFactorStatusGet(services)).status).toBeGreaterThanOrEqual(400);

    mocks.startSetup.mockRejectedValue(new Error("db down"));
    expect(
      (await setupStartPost(new Request("http://localhost"), services)).status
    ).toBeGreaterThanOrEqual(400);

    mocks.disable.mockRejectedValue(new Error("db down"));
    expect(
      (
        await disablePost(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ code: "123456" }),
          }),
          services
        )
      ).status
    ).toBeGreaterThanOrEqual(400);

    mocks.regenerateBackupCodes.mockRejectedValue(new Error("db down"));
    expect(
      (
        await regeneratePost(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ code: "123456" }),
          }),
          services
        )
      ).status
    ).toBeGreaterThanOrEqual(400);
  });

  it("maps unexpected session and passkey route failures", async () => {
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: "session-id",
    });
    mocks.pingSession.mockRejectedValue(new Error("db down"));
    expect((await sessionsPingPost(new Request("http://localhost"), services)).status).toBe(500);

    mocks.revokeAllSessions.mockRejectedValue(new Error("db down"));
    expect((await revokeAllPost(new Request("http://localhost"), services)).status).toBe(500);

    mocks.revokeCurrentSession.mockRejectedValue(new Error("db down"));
    expect((await revokeCurrentPost(services)).status).toBe(500);

    mocks.listPasskeys.mockRejectedValue(new Error("db down"));
    expect((await passkeysGet(services)).status).toBe(500);

    mocks.removePasskey.mockRejectedValue(new Error("db down"));
    expect(
      (
        await passkeyDelete(
          new Request("http://localhost"),
          { params: Promise.resolve({ id: "pk-1" }) },
          services
        )
      ).status
    ).toBe(500);
  });

  it("maps unexpected account route failures", async () => {
    mocks.getDeletionRequirements.mockRejectedValue(new Error("db down"));
    expect((await accountGet(services)).status).toBe(500);
  });
});
