import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "@/lib/db/types";
import { createTwoFactorRepository } from "./two-factor-repository";

function buildDb(returnedRows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnedRows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  return {
    db: { update } as unknown as DbClient,
    update,
    set,
    where,
    returning,
  };
}

describe("two-factor backup code consumption", () => {
  it("consumes a current or legacy candidate in one conditional update", async () => {
    const row = { id: "code-1", usedAt: new Date() };
    const mocks = buildDb([row]);
    const repository = createTwoFactorRepository(mocks.db);

    await expect(
      repository.consumeBackupCodeByHashes("user-1", ["hmac-hash", "legacy-hash"])
    ).resolves.toBe(row);

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.set).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
    expect(mocks.where).toHaveBeenCalledOnce();
    expect(mocks.returning).toHaveBeenCalledOnce();
  });

  it("returns null when the code was already consumed by another request", async () => {
    const mocks = buildDb([]);
    const repository = createTwoFactorRepository(mocks.db);

    await expect(
      repository.consumeBackupCodeByHashes("user-1", ["hmac-hash", "legacy-hash"])
    ).resolves.toBeNull();
  });

  it("does not issue an update without a candidate", async () => {
    const mocks = buildDb([]);
    const repository = createTwoFactorRepository(mocks.db);

    await expect(repository.consumeBackupCodeByHashes("user-1", [])).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
