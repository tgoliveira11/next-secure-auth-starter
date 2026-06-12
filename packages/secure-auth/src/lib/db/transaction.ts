import "server-only";
import type { DbClient } from "./types.js";

/** Runs multiple repository writes atomically; rolls back on failure. */
export function createRunInTransaction(db: DbClient) {
  return async function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return db.transaction(fn);
  };
}

export type RunInTransaction = ReturnType<typeof createRunInTransaction>;
