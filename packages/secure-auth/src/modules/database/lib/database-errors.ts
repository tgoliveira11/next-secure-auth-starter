import "server-only";
import type { DbClient } from "@/lib/db/types";
import { users } from "@/lib/db/schema";

const SCHEMA_ERROR_PATTERNS = [
  /relation "[^"]+" does not exist/i,
  /column "[^"]+" does not exist/i,
  /column .+ does not exist/i,
  /undefined column/i,
  /Failed query:/i,
] as const;

const MIGRATION_HINT =
  "Apply @tgoliveira/secure-auth package migrations (see docs/migrations.md). Expected migration 0002_v0_3_admin_platform.sql or later on the users table.";

export class DatabaseSchemaError extends Error {
  readonly name = "DatabaseSchemaError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export function extractPostgresMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const parts = [error.message];
  let current: unknown = error;

  for (let depth = 0; depth < 4; depth++) {
    if (!current || typeof current !== "object" || !("cause" in current)) break;
    const cause = (current as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      parts.push(cause.message);
      current = cause;
      continue;
    }
    if (typeof cause === "string") {
      parts.push(cause);
    }
    break;
  }

  return parts.join(" | ");
}

export function isDatabaseSchemaError(error: unknown): boolean {
  const message = extractPostgresMessage(error);
  return SCHEMA_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function getDatabaseErrorHint(error: unknown): string | undefined {
  if (!isDatabaseSchemaError(error)) return undefined;
  return MIGRATION_HINT;
}

export function wrapDatabaseSchemaError(error: unknown): Error {
  if (error instanceof DatabaseSchemaError) return error;
  if (!isDatabaseSchemaError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  return new DatabaseSchemaError(
    `@tgoliveira/secure-auth: database schema is out of date. ${MIGRATION_HINT}`,
    { cause: error instanceof Error ? error : undefined }
  );
}

export async function assertUsersTableSchema(db: DbClient): Promise<void> {
  try {
    await db.select({ status: users.status, role: users.role }).from(users).limit(0);
  } catch (error) {
    throw wrapDatabaseSchemaError(error);
  }
}
