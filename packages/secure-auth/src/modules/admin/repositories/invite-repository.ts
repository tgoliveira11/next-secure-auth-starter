import { eq, and, isNull, sql } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { inviteCodes, inviteUses } from "@/lib/db/schema";

export type InviteCode = typeof inviteCodes.$inferSelect;

export function createInviteRepository(db: DbClient) {
  return {
    async findByCode(code: string): Promise<InviteCode | null> {
      const [row] = await db
        .select()
        .from(inviteCodes)
        .where(eq(inviteCodes.code, code))
        .limit(1);
      return row ?? null;
    },

    async create(data: {
      code: string;
      createdBy?: string;
      maxUses?: number;
      emailHint?: string;
      expiresAt?: Date;
    }): Promise<InviteCode> {
      const [row] = await db
        .insert(inviteCodes)
        .values({
          code: data.code,
          createdBy: data.createdBy ?? null,
          maxUses: data.maxUses ?? null,
          emailHint: data.emailHint ?? null,
          expiresAt: data.expiresAt ?? null,
        })
        .returning();
      return row;
    },

    async incrementUsed(codeId: string, usedBy: string): Promise<void> {
      await db.insert(inviteUses).values({ codeId, usedBy });
      await db
        .update(inviteCodes)
        .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
        .where(eq(inviteCodes.id, codeId));
    },

    async revoke(codeId: string, revokedBy: string): Promise<InviteCode | null> {
      const [row] = await db
        .update(inviteCodes)
        .set({ revokedAt: new Date(), revokedBy })
        .where(and(eq(inviteCodes.id, codeId), isNull(inviteCodes.revokedAt)))
        .returning();
      return row ?? null;
    },

    async listAll(filter?: { createdBy?: string }): Promise<InviteCode[]> {
      if (filter?.createdBy) {
        return db
          .select()
          .from(inviteCodes)
          .where(eq(inviteCodes.createdBy, filter.createdBy))
          .orderBy(inviteCodes.createdAt);
      }
      return db.select().from(inviteCodes).orderBy(inviteCodes.createdAt);
    },

    async countActiveByUser(userId: string): Promise<number> {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inviteCodes)
        .where(and(eq(inviteCodes.createdBy, userId), isNull(inviteCodes.revokedAt)));
      return row?.count ?? 0;
    },
  };
}

export type InviteRepository = ReturnType<typeof createInviteRepository>;
