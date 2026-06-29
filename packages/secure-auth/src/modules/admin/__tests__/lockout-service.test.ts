import { describe, it, expect, vi } from "vitest";
import { createLockoutService } from "../services/lockout-service";
import type { LockoutRepository, LoginAttemptCounter } from "../repositories/lockout-repository";

function buildRepo(overrides?: Partial<LockoutRepository>): LockoutRepository {
  const store = new Map<string, LoginAttemptCounter>();

  function makeRow(email: string, patch: Partial<LoginAttemptCounter> = {}): LoginAttemptCounter {
    return {
      id: "test-id",
      userId: null,
      email,
      attempts: 1,
      frozenUntil: null,
      lockedAt: null,
      lastAttemptAt: new Date(),
      unlockedAt: null,
      unlockedBy: null,
      createdAt: new Date(),
      ...patch,
    };
  }

  return {
    findByUserId: vi.fn(async () => null),
    findByEmail: vi.fn(async (email) => store.get(email) ?? null),
    upsertByEmail: vi.fn(async (email, patch) => {
      const existing = store.get(email);
      const row = makeRow(email, { ...existing, ...patch });
      store.set(email, row);
      return row;
    }),
    resetByEmail: vi.fn(async (email) => {
      const row = store.get(email);
      if (row) store.set(email, { ...row, attempts: 0, frozenUntil: null, lockedAt: null, unlockedAt: new Date() });
    }),
    resetByUserId: vi.fn(async () => {}),
    listLocked: vi.fn(async () => []),
    listFrozen: vi.fn(async () => []),
    ...overrides,
  };
}

function buildConfig(enabled = true, thresholds?: unknown) {
  return {
    accountLockout: { enabled, thresholds },
  } as Parameters<typeof createLockoutService>[0]["config"];
}

describe("lockout-service", () => {
  it("disabled: returns ok without checking DB", async () => {
    const repo = buildRepo();
    const service = createLockoutService({ config: buildConfig(false), lockoutRepository: repo });
    const state = await service.getState("test@example.com");
    expect(state.status).toBe("ok");
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it("records failure and returns ok below first threshold", async () => {
    const repo = buildRepo();
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    const state = await service.recordFailure("test@example.com");
    expect(state.status).toBe("ok");
  });

  it("freezes account at threshold 1 (3 attempts)", async () => {
    // Simulate existing row with 2 attempts — next failure (3rd) should freeze
    const existing: LoginAttemptCounter = {
      id: "1", userId: null, email: "t@t.com", attempts: 2, frozenUntil: null, lockedAt: null,
      lastAttemptAt: new Date(), unlockedAt: null, unlockedBy: null, createdAt: new Date(),
    };
    const repo = buildRepo({
      findByEmail: vi.fn(async () => existing),
      upsertByEmail: vi.fn(async (_email, patch) => {
        return { ...existing, attempts: 3, ...patch } as LoginAttemptCounter;
      }),
    });
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    const state = await service.recordFailure("t@t.com");
    expect(state.status).toBe("frozen");
    if (state.status === "frozen") {
      expect(state.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("locks permanently at threshold 4 (12 attempts)", async () => {
    const repo = buildRepo({
      findByEmail: vi.fn(async () => ({
        id: "1", userId: null, email: "t@t.com", attempts: 11, frozenUntil: null, lockedAt: null,
        lastAttemptAt: new Date(), unlockedAt: null, unlockedBy: null, createdAt: new Date(),
      })),
      upsertByEmail: vi.fn(async (_email, patch) => ({
        id: "1", userId: null, email: "t@t.com", attempts: 12, lockedAt: patch.lockedAt ?? new Date(),
        frozenUntil: null, lastAttemptAt: new Date(), unlockedAt: null, unlockedBy: null, createdAt: new Date(),
        ...patch,
      }) as LoginAttemptCounter),
    });
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    const state = await service.recordFailure("t@t.com");
    expect(state.status).toBe("locked");
  });

  it("returns frozen state after freeze is set", async () => {
    const frozenUntil = new Date(Date.now() + 300_000);
    const repo = buildRepo({
      findByEmail: vi.fn(async () => ({
        id: "1", userId: null, email: "t@t.com", attempts: 3, frozenUntil,
        lockedAt: null, lastAttemptAt: new Date(), unlockedAt: null, unlockedBy: null, createdAt: new Date(),
      })),
    });
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    const state = await service.getState("t@t.com");
    expect(state.status).toBe("frozen");
  });

  it("returns ok state when freeze has expired", async () => {
    const frozenUntil = new Date(Date.now() - 1000);
    const repo = buildRepo({
      findByEmail: vi.fn(async () => ({
        id: "1", userId: null, email: "t@t.com", attempts: 3, frozenUntil,
        lockedAt: null, lastAttemptAt: new Date(), unlockedAt: null, unlockedBy: null, createdAt: new Date(),
      })),
    });
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    const state = await service.getState("t@t.com");
    expect(state.status).toBe("ok");
  });

  it("admin unlock resets counter", async () => {
    const repo = buildRepo();
    const service = createLockoutService({ config: buildConfig(), lockoutRepository: repo });
    await service.unlockByUserId("user-123", "admin-456");
    expect(repo.resetByUserId).toHaveBeenCalledWith("user-123", "admin-456");
  });
});
