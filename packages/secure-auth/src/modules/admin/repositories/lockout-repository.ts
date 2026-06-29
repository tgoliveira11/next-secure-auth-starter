import { eq, isNull, isNotNull, and, gt } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { loginAttemptCounters } from "@/lib/db/schema";

export type LoginAttemptCounter = typeof loginAttemptCounters.$inferSelect;

export function createLockoutRepository(db: DbClient) {
  return {
    async findByUserId(userId: string): Promise<LoginAttemptCounter | null> {
      const [row] = await db
        .select()
        .from(loginAttemptCounters)
        .where(eq(loginAttemptCounters.userId, userId))
        .limit(1);
      return row ?? null;
    },

    async findByEmail(email: string): Promise<LoginAttemptCounter | null> {
      const [row] = await db
        .select()
        .from(loginAttemptCounters)
        .where(eq(loginAttemptCounters.email, email))
        .limit(1);
      return row ?? null;
    },

    async upsertByEmail(
      email: string,
      patch: Partial<Pick<LoginAttemptCounter, "attempts" | "frozenUntil" | "lockedAt" | "lastAttemptAt" | "userId">>
    ): Promise<LoginAttemptCounter> {
      const existing = await this.findByEmail(email);
      if (existing) {
        const [row] = await db
          .update(loginAttemptCounters)
          .set({ ...patch, lastAttemptAt: patch.lastAttemptAt ?? new Date() })
          .where(eq(loginAttemptCounters.email, email))
          .returning();
        return row;
      }
      const [row] = await db
        .insert(loginAttemptCounters)
        .values({ email, attempts: 1, lastAttemptAt: new Date(), ...patch })
        .returning();
      return row;
    },

    async resetByEmail(email: string, unlockedBy?: string): Promise<void> {
      await db
        .update(loginAttemptCounters)
        .set({
          attempts: 0,
          frozenUntil: null,
          lockedAt: null,
          unlockedAt: new Date(),
          unlockedBy: unlockedBy ?? null,
        })
        .where(eq(loginAttemptCounters.email, email));
    },

    async resetByUserId(userId: string, unlockedBy: string): Promise<void> {
      await db
        .update(loginAttemptCounters)
        .set({
          attempts: 0,
          frozenUntil: null,
          lockedAt: null,
          unlockedAt: new Date(),
          unlockedBy,
        })
        .where(eq(loginAttemptCounters.userId, userId));
    },

    async listLocked(): Promise<LoginAttemptCounter[]> {
      return db
        .select()
        .from(loginAttemptCounters)
        .where(and(isNotNull(loginAttemptCounters.lockedAt), isNull(loginAttemptCounters.unlockedAt)));
    },

    async listFrozen(): Promise<LoginAttemptCounter[]> {
      return db
        .select()
        .from(loginAttemptCounters)
        .where(gt(loginAttemptCounters.frozenUntil, new Date()));
    },
  };
}

export type LockoutRepository = ReturnType<typeof createLockoutRepository>;
