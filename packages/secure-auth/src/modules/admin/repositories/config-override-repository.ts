import { eq } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { adminConfigOverrides } from "@/lib/db/schema";

export type AdminConfigOverride = typeof adminConfigOverrides.$inferSelect;

export function createConfigOverrideRepository(db: DbClient) {
  return {
    async getAll(): Promise<AdminConfigOverride[]> {
      return db.select().from(adminConfigOverrides).orderBy(adminConfigOverrides.key);
    },

    async get(key: string): Promise<AdminConfigOverride | null> {
      const [row] = await db
        .select()
        .from(adminConfigOverrides)
        .where(eq(adminConfigOverrides.key, key))
        .limit(1);
      return row ?? null;
    },

    async set(key: string, value: unknown, updatedBy: string): Promise<AdminConfigOverride> {
      const [row] = await db
        .insert(adminConfigOverrides)
        .values({ key, value, updatedBy, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: adminConfigOverrides.key,
          set: { value, updatedBy, updatedAt: new Date() },
        })
        .returning();
      return row;
    },

    async delete(key: string): Promise<void> {
      await db.delete(adminConfigOverrides).where(eq(adminConfigOverrides.key, key));
    },
  };
}

export type ConfigOverrideRepository = ReturnType<typeof createConfigOverrideRepository>;
