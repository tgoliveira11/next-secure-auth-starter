import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getSecureAuthDb } from "../../core/secure-auth-runtime.js";
import type { AuthSchema } from "../../drizzle/schema.js";

export type DbClient = PostgresJsDatabase<AuthSchema>;

/** Returns the database instance injected via createSecureAuth({ db }). */
export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    return Reflect.get(getSecureAuthDb() as object, prop);
  },
});