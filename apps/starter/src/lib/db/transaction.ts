import "server-only";
import { db, type DbClient } from "./index";

/** Runs multiple repository writes atomically; rolls back on failure. */
export async function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
