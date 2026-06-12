import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  return { values, insert };
});

vi.mock("@/lib/db", () => ({
  db: { insert: mocks.insert },
}));

import { auditRepository } from "../repositories/audit-repository";

describe("auditRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists account deletion audit events with metadata", async () => {
    await auditRepository.record("account_deletion_requested", "user-1", {
      endpoint: "/api/account",
      authProvider: "google",
      method: "session",
    });

    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "account_deletion_requested",
        userId: "user-1",
        metadata: expect.objectContaining({
          endpoint: "/api/account",
          authProvider: "google",
          method: "session",
        }),
      })
    );
  });
});