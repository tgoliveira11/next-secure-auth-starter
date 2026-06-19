import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAccountTokenRepository } from "../account-token-repository";

describe("accountTokenRepository.deleteExpiredTokens", () => {
  const where = vi.fn(async () => undefined);
  const deleteFn = vi.fn(() => ({ where }));
  const db = { delete: deleteFn } as unknown as Parameters<typeof createAccountTokenRepository>[0];
  const repository = createAccountTokenRepository(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a delete filtered by expiry", async () => {
    await repository.deleteExpiredTokens();

    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("removes expired consumed and unconsumed tokens when backed by a real delete", async () => {
    const now = new Date();
    const expiredConsumed = {
      id: "expired-consumed",
      expiresAt: new Date(now.getTime() - 60_000),
      consumedAt: new Date(now.getTime() - 30_000),
    };
    const expiredUnconsumed = {
      id: "expired-unconsumed",
      expiresAt: new Date(now.getTime() - 60_000),
      consumedAt: null,
    };
    const activeConsumed = {
      id: "active-consumed",
      expiresAt: new Date(now.getTime() + 60_000),
      consumedAt: new Date(now.getTime() - 30_000),
    };

    const rows = [expiredConsumed, expiredUnconsumed, activeConsumed];
    const statefulDb = {
      delete: () => ({
        where: async () => {
          const cutoff = new Date();
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            if (rows[index]!.expiresAt < cutoff) {
              rows.splice(index, 1);
            }
          }
        },
      }),
    } as unknown as Parameters<typeof createAccountTokenRepository>[0];

    const statefulRepository = createAccountTokenRepository(statefulDb);
    await statefulRepository.deleteExpiredTokens();

    expect(rows.map((row) => row.id)).toEqual(["active-consumed"]);
  });

  it("does not delete non-expired consumed tokens", async () => {
    const now = new Date();
    const activeConsumed = {
      id: "active-consumed",
      expiresAt: new Date(now.getTime() + 60_000),
      consumedAt: new Date(now.getTime() - 30_000),
    };

    const rows = [activeConsumed];
    const statefulDb = {
      delete: () => ({
        where: async () => {
          const cutoff = new Date();
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            if (rows[index]!.expiresAt < cutoff) {
              rows.splice(index, 1);
            }
          }
        },
      }),
    } as unknown as Parameters<typeof createAccountTokenRepository>[0];

    const statefulRepository = createAccountTokenRepository(statefulDb);
    await statefulRepository.deleteExpiredTokens();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("active-consumed");
  });
});
