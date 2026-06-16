import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { rateLimitBuckets } from "@/drizzle/schema";
import type { RateLimitAdapter, RateLimitResult, RateLimitScope } from "../core/types";
import { buildRateLimitKey } from "../core/types";

function parseResetAt(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function wrapRateLimitStorageError(error: unknown): Error {
  const pgMessage = extractPostgresMessage(error);
  if (/rate_limit_buckets/i.test(pgMessage) && /does not exist|relation/i.test(pgMessage)) {
    return new Error(
      "@tgoliveira/secure-auth: rate_limit_buckets table is missing. Apply package migrations when AUTH_RATE_LIMIT_STORE=postgres.",
      { cause: error instanceof Error ? error : undefined }
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

function extractPostgresMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return error.message;
}

/**
 * PostgreSQL-backed rate limit store for production deployments.
 * Uses atomic upsert so limits are shared across app instances.
 */
export class PostgresRateLimitAdapter implements RateLimitAdapter {
  constructor(private readonly db: DbClient) {}

  async check(
    scope: RateLimitScope,
    maxAttempts: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const key = buildRateLimitKey(scope);
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);
    const nowIso = now.toISOString();
    const resetAtIso = resetAt.toISOString();

    try {
      const [row] = await this.db
        .insert(rateLimitBuckets)
        .values({
          bucketKey: key,
          count: 1,
          resetAt,
        })
        .onConflictDoUpdate({
          target: rateLimitBuckets.bucketKey,
          set: {
            count: sql`CASE
              WHEN ${rateLimitBuckets.resetAt} <= ${nowIso}::timestamptz
              THEN 1
              ELSE ${rateLimitBuckets.count} + 1
            END`,
            resetAt: sql`CASE
              WHEN ${rateLimitBuckets.resetAt} <= ${nowIso}::timestamptz
              THEN ${resetAtIso}::timestamptz
              ELSE ${rateLimitBuckets.resetAt}
            END`,
          },
        })
        .returning({
          count: rateLimitBuckets.count,
          resetAt: rateLimitBuckets.resetAt,
        });

      if (!row) return { allowed: true };

      const count = Number(row.count);
      const rowResetAt = parseResetAt(row.resetAt);

      if (count > maxAttempts) {
        return { allowed: false, retryAfterMs: Math.max(0, rowResetAt.getTime() - Date.now()) };
      }

      return { allowed: true };
    } catch (error) {
      throw wrapRateLimitStorageError(error);
    }
  }

  async reset(scope: RateLimitScope): Promise<void> {
    const key = buildRateLimitKey(scope);
    try {
      await this.db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, key));
    } catch (error) {
      throw wrapRateLimitStorageError(error);
    }
  }
}
