import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setRateLimitAdapterForTests,
  checkRateLimit,
} from "@/server/policies/rate-limit";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import { PostgresRateLimitAdapter } from "@/server/policies/rate-limit/postgres-adapter";

describe("rate limit adapter factory", () => {
  const originalStore = process.env.RATE_LIMIT_STORE;

  beforeEach(() => {
    resetAllInMemoryRateLimits();
    setRateLimitAdapterForTests(null);
  });

  afterEach(() => {
    process.env.RATE_LIMIT_STORE = originalStore;
    setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
  });

  it("selects postgres adapter when RATE_LIMIT_STORE=postgres", async () => {
    process.env.RATE_LIMIT_STORE = "postgres";
    const execute = vi.fn().mockResolvedValue([{ count: 1, reset_at: new Date(Date.now() + 1000) }]);
    vi.spyOn(PostgresRateLimitAdapter.prototype, "check").mockImplementation(async () => ({
      allowed: true,
    }));

    setRateLimitAdapterForTests(null);
    await expect(
      checkRateLimit({
        operation: "auth.login",
        userId: "user-1",
        endpoint: "/api/auth/login/start",
      })
    ).resolves.toEqual({ allowed: true });

    expect(execute).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
