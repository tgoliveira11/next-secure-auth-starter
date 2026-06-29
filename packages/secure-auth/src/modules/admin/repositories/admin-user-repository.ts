import { eq, and, count, desc, sql } from "drizzle-orm";
import type { DbClient } from "@/lib/db/types";
import { users } from "@/lib/db/schema";

export type AdminUserFilter = {
  role?: "user" | "admin";
  status?: "pending" | "active" | "suspended";
  search?: string;
  limit?: number;
  offset?: number;
};

export function createAdminUserRepository(db: DbClient) {
  return {
    async list(filter: AdminUserFilter = {}) {
      const { role, status, search, limit = 50, offset = 0 } = filter;

      const conditions = [];
      if (role) conditions.push(eq(users.role, role));
      if (status) conditions.push(eq(users.status, status));
      if (search) {
        conditions.push(sql`lower(${users.email}) like ${"%" + search.toLowerCase() + "%"}`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(users)
          .where(where)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(users)
          .where(where),
      ]);

      return { users: rows, total: Number(total) };
    },

    async findById(id: string) {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user ?? null;
    },

    async findByEmail(email: string) {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return user ?? null;
    },

    async countByRole(role: "user" | "admin") {
      const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.role, role));
      return Number(total);
    },

    async setRole(id: string, role: "user" | "admin") {
      const [user] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user ?? null;
    },

    async setStatus(id: string, status: "pending" | "active" | "suspended") {
      const [user] = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user ?? null;
    },
  };
}

export type AdminUserRepository = ReturnType<typeof createAdminUserRepository>;
