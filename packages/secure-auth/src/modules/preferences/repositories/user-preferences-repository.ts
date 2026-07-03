import { and, eq, sql } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { userPreferences } from "@/lib/db/schema";

export type UserPreferenceRow = typeof userPreferences.$inferSelect;

export function createUserPreferencesRepository(db: DbClient) {
  return {
    async listByNamespace(userId: string, namespace: string): Promise<UserPreferenceRow[]> {
      return db
        .select()
        .from(userPreferences)
        .where(and(eq(userPreferences.userId, userId), eq(userPreferences.namespace, namespace)))
        .orderBy(userPreferences.key);
    },

    async get(
      userId: string,
      namespace: string,
      key: string
    ): Promise<UserPreferenceRow | null> {
      const [row] = await db
        .select()
        .from(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, userId),
            eq(userPreferences.namespace, namespace),
            eq(userPreferences.key, key)
          )
        )
        .limit(1);
      return row ?? null;
    },

    async countByNamespace(userId: string, namespace: string): Promise<number> {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userPreferences)
        .where(and(eq(userPreferences.userId, userId), eq(userPreferences.namespace, namespace)));
      return result?.count ?? 0;
    },

    async upsert(
      userId: string,
      namespace: string,
      key: string,
      value: unknown
    ): Promise<UserPreferenceRow> {
      const now = new Date();
      const [row] = await db
        .insert(userPreferences)
        .values({
          userId,
          namespace,
          key,
          value,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [userPreferences.userId, userPreferences.namespace, userPreferences.key],
          set: {
            value,
            updatedAt: now,
          },
        })
        .returning();
      return row;
    },

    async delete(userId: string, namespace: string, key: string): Promise<boolean> {
      const deleted = await db
        .delete(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, userId),
            eq(userPreferences.namespace, namespace),
            eq(userPreferences.key, key)
          )
        )
        .returning({ key: userPreferences.key });
      return deleted.length > 0;
    },

    async listAllForUser(userId: string): Promise<UserPreferenceRow[]> {
      return db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .orderBy(userPreferences.namespace, userPreferences.key);
    },
  };
}

export type UserPreferencesRepository = ReturnType<typeof createUserPreferencesRepository>;
