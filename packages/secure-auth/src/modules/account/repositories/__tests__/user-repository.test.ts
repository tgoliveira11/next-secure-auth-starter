import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "@/lib/db/types";
import { createUserRepository } from "../user-repository";

const LEGACY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0";
const ARGON_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA==$ZGlnZXN0";

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

describe("user repository password hash compare-and-set", () => {
  it("updates only the hash representation and preserves passwordUpdatedAt", async () => {
    const row = { id: "user-1", passwordHash: ARGON_HASH };
    const mocks = buildDb([row]);
    const repository = createUserRepository(mocks.db);

    await expect(
      repository.upgradePasswordHashIfCurrent("user-1", LEGACY_HASH, ARGON_HASH)
    ).resolves.toBe(row);

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.set).toHaveBeenCalledWith({
      passwordHash: ARGON_HASH,
      updatedAt: expect.any(Date),
    });
    expect(mocks.set.mock.calls[0]?.[0]).not.toHaveProperty("passwordUpdatedAt");
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it("returns null when a concurrent update changed the expected hash", async () => {
    const mocks = buildDb([]);
    const repository = createUserRepository(mocks.db);

    await expect(
      repository.upgradePasswordHashIfCurrent("user-1", LEGACY_HASH, ARGON_HASH)
    ).resolves.toBeNull();
  });

  it("rejects plaintext for either compare-and-set hash", async () => {
    const mocks = buildDb([]);
    const repository = createUserRepository(mocks.db);

    await expect(
      repository.upgradePasswordHashIfCurrent("user-1", "plaintext", ARGON_HASH)
    ).rejects.toThrow(/never plaintext/);
    await expect(
      repository.upgradePasswordHashIfCurrent("user-1", LEGACY_HASH, "plaintext")
    ).rejects.toThrow(/never plaintext/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
