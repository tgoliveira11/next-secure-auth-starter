import { describe, it, expect, vi, beforeEach } from "vitest";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/modules/account/lib/account-deletion";
import { createAccountService } from "../account-service";
import type { DbClient } from "@/lib/db/types";
import type { RunInTransaction } from "@/lib/db/transaction";
import { ReauthenticationRequiredError, ValidationError } from "@/modules/account/lib/account-errors";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findSession: vi.fn(),
  deleteById: vi.fn(),
  verifyPassword: vi.fn(),
  enforceRateLimit: vi.fn(),
  recordAudit: vi.fn(),
  runInTransaction: vi.fn(async <T>(fn: (tx: DbClient) => Promise<T>) =>
    fn({} as DbClient)
  ) as RunInTransaction,
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  verifyPassword: mocks.verifyPassword,
}));

const accountService = createAccountService({
  repos: {
    userRepository: {
      findById: mocks.findById,
      deleteById: mocks.deleteById,
    },
    accountSessionRepository: {
      findByIdForUser: mocks.findSession,
    },
    auditRepository: {
      record: mocks.recordAudit,
    },
  } as never,
  rateLimit: {
    enforceRateLimit: mocks.enforceRateLimit,
  } as never,
  runInTransaction: mocks.runInTransaction,
});

const now = new Date();

describe("accountService.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.findSession.mockResolvedValue({
      authMethod: "google",
      lastUsedAt: now,
      createdAt: now,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 3_600_000),
    });
  });

  it("deletes password accounts after password verification", async () => {
    mocks.findById.mockResolvedValue({
      id: "user-1",
      authProvider: "credentials",
      passwordHash: "hash",
    });

    await accountService.deleteAccount(
      "user-1",
      { confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE, password: "secret" },
      { ip: "127.0.0.1", accountSessionId: "sess-1" }
    );

    expect(mocks.verifyPassword).toHaveBeenCalledWith("secret", "hash");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "account_deletion_requested",
      "user-1",
      expect.objectContaining({ method: "password" })
    );
    expect(mocks.deleteById).toHaveBeenCalled();
  });

  it("deletes OAuth-only accounts with matching fresh session", async () => {
    mocks.findById.mockResolvedValue({
      id: "user-1",
      authProvider: "google",
      passwordHash: null,
    });

    await accountService.deleteAccount(
      "user-1",
      { confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE },
      { accountSessionId: "sess-1" }
    );

    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "account_deletion_requested",
      "user-1",
      expect.objectContaining({ method: "session", authProvider: "google" })
    );
  });

  it("rejects OAuth-only deletion without session context", async () => {
    mocks.findById.mockResolvedValue({
      id: "user-1",
      authProvider: "google",
      passwordHash: null,
    });

    await expect(
      accountService.deleteAccount("user-1", {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      })
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);
  });

  it("rejects invalid confirmation phrase", async () => {
    mocks.findById.mockResolvedValue({
      id: "user-1",
      authProvider: "credentials",
      passwordHash: "hash",
    });

    await expect(
      accountService.deleteAccount("user-1", {
        confirmationPhrase: "wrong",
        password: "secret",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects password accounts without password", async () => {
    mocks.findById.mockResolvedValue({
      id: "user-1",
      authProvider: "credentials",
      passwordHash: "hash",
    });

    await expect(
      accountService.deleteAccount("user-1", {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      })
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);
  });
});
