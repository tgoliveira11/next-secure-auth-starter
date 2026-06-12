import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditRepository } from "../repositories/audit-repository";

describe("auditRepository", () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  const db = { insert } as unknown as Parameters<typeof createAuditRepository>[0];
  const auditRepository = createAuditRepository(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists account deletion audit events with metadata", async () => {
    await auditRepository.record("account_deletion_requested", "user-1", {
      endpoint: "/api/account",
      authProvider: "google",
      method: "session",
    });

    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
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
