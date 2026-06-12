import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AuthSchema } from "../../drizzle/schema.js";

export type DbClient = PostgresJsDatabase<AuthSchema>;
