import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "@/lib/db/types";
import { createPasskeyRepository } from "./passkey-repository";

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

describe("passkey repository counter compare-and-set", () => {
  it("reports advanced only when the expected counter row is updated", async () => {
    const mocks = buildDb([{ credentialId: "credential-id" }]);
    const repository = createPasskeyRepository(mocks.db);

    await expect(repository.advanceCounter("credential-id", "7", "8", 12)).resolves.toBe(
      "advanced"
    );
    expect(mocks.set).toHaveBeenCalledWith({
      counter: "8",
      counterRevision: expect.anything(),
    });
    expect(mocks.returning).toHaveBeenCalledOnce();
  });

  it("reports conflict when a concurrent update changed the expected counter", async () => {
    const mocks = buildDb([]);
    const repository = createPasskeyRepository(mocks.db);

    await expect(repository.advanceCounter("credential-id", "7", "8", 12)).resolves.toBe(
      "conflict"
    );
  });

  it("still performs compare-and-set for a counterless 0 -> 0 credential", async () => {
    const mocks = buildDb([{ credentialId: "credential-id" }]);
    const repository = createPasskeyRepository(mocks.db);

    await expect(repository.advanceCounter("credential-id", "0", "0", 12)).resolves.toBe(
      "advanced"
    );
    expect(mocks.set).toHaveBeenCalledWith({
      counter: "0",
      counterRevision: expect.anything(),
    });
  });
});
