import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClient } from "@/lib/db/types";
import { createPasskeyAccountService } from "../passkey-account-service";
import { PasskeyAccountBoundaryError } from "../passkey-service";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  findByIdForUser: vi.fn(),
  revoke: vi.fn(),
  record: vi.fn(),
  runInTransaction: vi.fn(async <T>(fn: (tx: DbClient) => Promise<T>) => fn({} as DbClient)),
}));

function createService() {
  return createPasskeyAccountService({
    ctx: {
      getWebAuthnRpName: () => "Test",
      getWebAuthnRpId: () => "localhost",
      getWebAuthnOrigins: () => ["http://localhost:3003"],
    } as never,
    repos: {
      passkeyRepository: {
        findByUserId: mocks.findByUserId,
        findByIdForUser: mocks.findByIdForUser,
        revoke: mocks.revoke,
      },
      auditRepository: {
        record: mocks.record,
      },
    } as never,
    rateLimit: { enforceRateLimit: vi.fn() } as never,
    runInTransaction: mocks.runInTransaction as never,
  });
}

describe("passkey account service capability boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists vault-only credentials as non-removable", async () => {
    mocks.findByUserId.mockResolvedValue([
      {
        id: "pk-vault",
        friendlyName: "Vault passkey",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastUsedAt: null,
        signInEnabled: false,
        vaultUnlockEnabled: true,
      },
    ]);

    const service = createService();
    const passkeys = await service.listPasskeys("user-1");

    expect(passkeys[0]).toMatchObject({
      signInEnabled: false,
      vaultUnlockEnabled: true,
      removableFromAccountSettings: false,
      badge: "Vault unlock only",
    });
  });

  it("allows removing sign-in-only credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-1",
      signInEnabled: true,
      vaultUnlockEnabled: false,
    });
    mocks.revoke.mockResolvedValue({ id: "pk-1" });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-1")).resolves.toEqual({ success: true });
    expect(mocks.revoke).toHaveBeenCalled();
  });

  it("rejects removing vault-only credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-vault",
      signInEnabled: false,
      vaultUnlockEnabled: true,
    });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-vault")).rejects.toBeInstanceOf(
      PasskeyAccountBoundaryError
    );
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it("rejects removing dual-capability credentials", async () => {
    mocks.findByIdForUser.mockResolvedValue({
      id: "pk-dual",
      signInEnabled: true,
      vaultUnlockEnabled: true,
    });

    const service = createService();
    await expect(service.removePasskey("user-1", "pk-dual")).rejects.toBeInstanceOf(
      PasskeyAccountBoundaryError
    );
  });
});
