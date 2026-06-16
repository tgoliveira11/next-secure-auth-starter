import { describe, it, expect, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { authSchema } from "@/drizzle/schema";
import { PostgresRateLimitAdapter } from "../postgres-adapter";
import type { RateLimitScope } from "../../core/types";

const integrationUrl = process.env.INTEGRATION_DATABASE_URL?.trim();
const describeIntegration = integrationUrl ? describe : describe.skip;

describeIntegration("PostgresRateLimitAdapter integration", () => {
  const sql = postgres(integrationUrl!, { max: 1 });
  const db = drizzle(sql, { schema: authSchema });
  const adapter = new PostgresRateLimitAdapter(db);

  const scope: RateLimitScope = {
    operation: "passkey.login",
    ip: "127.0.0.1",
    endpoint: "/api/auth/passkey/login/options",
  };

  afterAll(async () => {
    await adapter.reset(scope);
    await sql.end({ timeout: 1 });
  });

  it("increments and allows requests within the configured window", async () => {
    await adapter.reset(scope);

    const first = await adapter.check(scope, 20, 15 * 60 * 1000);
    const second = await adapter.check(scope, 20, 15 * 60 * 1000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });
});
