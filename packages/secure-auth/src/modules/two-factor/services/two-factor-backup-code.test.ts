import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTwoFactorService } from "./two-factor-service";

const getBackupCodeHashCandidates = vi.fn();
const consumeBackupCodeByHashes = vi.fn();
const record = vi.fn();

function buildService() {
  return createTwoFactorService({
    ctx: { getBackupCodeHashCandidates } as never,
    repos: {
      twoFactorRepository: { consumeBackupCodeByHashes },
      auditRepository: { record },
    } as never,
    rateLimit: {} as never,
    runInTransaction: vi.fn() as never,
    accountSessionService: {} as never,
  });
}

describe("two-factor backup code verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBackupCodeHashCandidates.mockReturnValue(["hmac-hash", "legacy-hash"]);
  });

  it("accepts only the row returned by atomic consumption", async () => {
    consumeBackupCodeByHashes.mockResolvedValue({ id: "code-1" });

    await expect(
      buildService().verifyUserCode("user-1", { backupCode: "ABCD-1234-EF56" })
    ).resolves.toBe("backup");

    expect(consumeBackupCodeByHashes).toHaveBeenCalledWith("user-1", [
      "hmac-hash",
      "legacy-hash",
    ]);
    expect(record).toHaveBeenCalledWith(
      "two_factor_backup_code_used",
      "user-1",
      expect.objectContaining({ method: "backup_code" })
    );
  });

  it("rejects an already-consumed code and does not emit a success audit", async () => {
    consumeBackupCodeByHashes.mockResolvedValue(null);

    await expect(
      buildService().verifyUserCode("user-1", { backupCode: "ABCD-1234-EF56" })
    ).resolves.toBeNull();

    expect(record).not.toHaveBeenCalled();
  });
});
