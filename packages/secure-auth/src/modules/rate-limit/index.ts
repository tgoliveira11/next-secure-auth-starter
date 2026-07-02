import "server-only";
import type {
  RateLimitAdapter,
  RateLimitOperation,
  RateLimitResult,
  RateLimitScope,
} from "./core/types";
import { RATE_LIMIT_POLICIES } from "./core/types";
import { InMemoryRateLimitAdapter } from "./adapters/in-memory-adapter";
import { PostgresRateLimitAdapter } from "./adapters/postgres-adapter";
import { resolveRateLimitStore, assertProductionRateLimitConfig } from "@/core/config-accessors.js";
import type { SecureAuthConfig, SecureAuthDb } from "@/core/types.js";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function createRateLimitApi(deps: { config: SecureAuthConfig; db: SecureAuthDb }) {
  assertProductionRateLimitConfig(deps.config);
  let adapter: RateLimitAdapter | null = null;

  function resolveAdapter(): RateLimitAdapter {
    if (adapter) return adapter;

    const store = resolveRateLimitStore(deps.config);
    if (store === "postgres") {
      adapter = new PostgresRateLimitAdapter(deps.db);
    } else {
      adapter = new InMemoryRateLimitAdapter();
    }
    return adapter;
  }

  async function checkRateLimit(scope: RateLimitScope): Promise<RateLimitResult> {
    const policy = RATE_LIMIT_POLICIES[scope.operation];
    return resolveAdapter().check(scope, policy.maxAttempts, policy.windowMs);
  }

  async function resetRateLimit(scope: RateLimitScope): Promise<void> {
    await resolveAdapter().reset(scope);
  }

  async function enforceRateLimit(scope: RateLimitScope): Promise<void> {
    const result = await checkRateLimit(scope);
    if (!result.allowed) {
      throw new RateLimitError("Too many requests. Please try again later.");
    }
  }

  return {
    checkRateLimit,
    resetRateLimit,
    enforceRateLimit,
    /** Override adapter in tests. */
    setAdapterForTests(next: RateLimitAdapter | null) {
      adapter = next;
    },
  };
}

export type RateLimitApi = ReturnType<typeof createRateLimitApi>;

export { buildRateLimitKey, RATE_LIMIT_POLICIES } from "./core/types";
export type {
  RateLimitOperation,
  RateLimitScope,
  RateLimitResult,
  RateLimitAdapter,
} from "./core/types";
