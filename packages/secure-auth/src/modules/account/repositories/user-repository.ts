import { eq } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { users } from "@/lib/db/schema";
import { assertPasswordHashFormat } from "@/modules/security/policies/password-hashing";

function validateStoredPasswordHash(passwordHash: string | null | undefined) {
  if (passwordHash != null) {
    assertPasswordHashFormat(passwordHash);
  }
}

export function createUserRepository(db: DbClient) {
  return {
    async findByEmail(email: string) {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return user ?? null;
    },

    async findById(id: string) {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user ?? null;
    },

    async create(data: {
      email: string;
      authProvider: string;
      passwordHash?: string | null;
    }) {
      validateStoredPasswordHash(data.passwordHash);

      const [user] = await db
        .insert(users)
        .values({
          email: data.email,
          authProvider: data.authProvider,
          passwordHash: data.passwordHash ?? null,
        })
        .returning();
      return user;
    },

    async updatePassword(id: string, passwordHash: string, client: DbClient = db) {
      validateStoredPasswordHash(passwordHash);
      const now = new Date();

      const [user] = await client
        .update(users)
        .set({ passwordHash, passwordUpdatedAt: now, updatedAt: now })
        .where(eq(users.id, id))
        .returning();
      return user;
    },

    async markEmailVerified(id: string, client: DbClient = db) {
      const now = new Date();
      const [user] = await client
        .update(users)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, id))
        .returning();
      return user ?? null;
    },

    async deleteById(id: string, client: DbClient = db) {
      const [user] = await client.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      return user ?? null;
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
