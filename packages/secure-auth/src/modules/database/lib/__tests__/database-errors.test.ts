import { describe, it, expect } from "vitest";
import {
  DatabaseSchemaError,
  assertUsersTableSchema,
  extractPostgresMessage,
  getDatabaseErrorHint,
  isDatabaseSchemaError,
  wrapDatabaseSchemaError,
} from "../database-errors";

describe("database-errors", () => {
  it("detects missing column errors from drizzle/postgres messages", () => {
    const error = new Error(
      'Failed query: select "status" from "users" limit $1\nparams: 0\n cause: column "status" does not exist'
    );

    expect(isDatabaseSchemaError(error)).toBe(true);
    expect(getDatabaseErrorHint(error)).toContain("0002_v0_3_admin_platform.sql");
  });

  it("detects missing relation errors", () => {
    const error = new Error('relation "users" does not exist');
    expect(isDatabaseSchemaError(error)).toBe(true);
  });

  it("returns no hint for non-schema errors", () => {
    expect(getDatabaseErrorHint(new Error("ECONNREFUSED"))).toBeUndefined();
    expect(isDatabaseSchemaError("not an error")).toBe(false);
  });

  it("wraps schema errors with DatabaseSchemaError", () => {
    const wrapped = wrapDatabaseSchemaError(new Error('column "status" does not exist'));
    expect(wrapped).toBeInstanceOf(DatabaseSchemaError);
    expect(wrapped.message).toContain("schema is out of date");
  });

  it("returns the original DatabaseSchemaError unchanged", () => {
    const original = new DatabaseSchemaError("already wrapped");
    expect(wrapDatabaseSchemaError(original)).toBe(original);
  });

  it("returns the original error when it is not schema-related", () => {
    const error = new Error("ECONNREFUSED");
    expect(wrapDatabaseSchemaError(error)).toBe(error);
    expect(wrapDatabaseSchemaError("plain")).toEqual(new Error("plain"));
  });

  it("extracts nested postgres cause messages", () => {
    const error = new Error("Failed query", {
      cause: new Error('column "role" does not exist'),
    });
    expect(extractPostgresMessage(error)).toContain('column "role" does not exist');
  });

  it("extracts string causes and non-error values", () => {
    const withStringCause = new Error("outer", { cause: "inner string" });
    expect(extractPostgresMessage(withStringCause)).toContain("inner string");
    expect(extractPostgresMessage("raw")).toBe("raw");
  });

  it("assertUsersTableSchema passes when the probe query succeeds", async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: async () => [],
        }),
      }),
    };

    await expect(assertUsersTableSchema(db as never)).resolves.toBeUndefined();
  });

  it("assertUsersTableSchema wraps schema probe failures", async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: async () => {
            throw new Error('column "status" does not exist');
          },
        }),
      }),
    };

    await expect(assertUsersTableSchema(db as never)).rejects.toBeInstanceOf(DatabaseSchemaError);
  });
});
