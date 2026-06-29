import { eq, and, isNull, like } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { apiKeys } from "@/lib/db/schema";

export type ApiKey = typeof apiKeys.$inferSelect;

export function createApiKeyRepository(db: DbClient) {
  return {
    async create(data: {
      name: string;
      keyHash: string;
      keyPrefix: string;
      scopes: string[];
      createdBy?: string;
      expiresAt?: Date | null;
    }): Promise<ApiKey> {
      const [row] = await db
        .insert(apiKeys)
        .values({
          name: data.name,
          keyHash: data.keyHash,
          keyPrefix: data.keyPrefix,
          scopes: data.scopes,
          createdBy: data.createdBy ?? null,
          expiresAt: data.expiresAt ?? null,
        })
        .returning();
      return row;
    },

    async findByPrefix(prefix: string): Promise<ApiKey[]> {
      return db
        .select()
        .from(apiKeys)
        .where(and(like(apiKeys.keyPrefix, `${prefix}%`), isNull(apiKeys.revokedAt)));
    },

    async findById(id: string): Promise<ApiKey | null> {
      const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
      return row ?? null;
    },

    async listAll(): Promise<ApiKey[]> {
      return db.select().from(apiKeys).orderBy(apiKeys.createdAt);
    },

    async revoke(id: string, revokedBy: string): Promise<ApiKey | null> {
      const [row] = await db
        .update(apiKeys)
        .set({ revokedAt: new Date(), revokedBy })
        .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
        .returning();
      return row ?? null;
    },

    async touch(id: string): Promise<void> {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, id));
    },
  };
}

export type ApiKeyRepository = ReturnType<typeof createApiKeyRepository>;
