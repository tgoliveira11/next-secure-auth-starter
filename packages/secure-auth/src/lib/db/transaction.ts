import "server-only";
import { db } from "./index";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AuthSchema } from "../../drizzle/schema.js";

export type DbClient = PostgresJsDatabase<AuthSchema>;

/** Runs multiple repository writes atomically; rolls back on failure. */
export async function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
