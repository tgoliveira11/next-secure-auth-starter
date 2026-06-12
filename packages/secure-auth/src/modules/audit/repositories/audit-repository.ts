import type { DbClient } from "@/lib/db/types";
import { auditEvents } from "@/lib/db/schema";
import { sanitizeAuditMetadata } from "@/modules/audit/core/audit-sanitization";

export function createAuditRepository(db: DbClient) {
  return {
    async record(
      eventType: string,
      userId?: string,
      metadata?: Record<string, unknown>,
      client: DbClient = db
    ) {
      await client.insert(auditEvents).values({
        userId: userId ?? null,
        eventType,
        metadata: sanitizeAuditMetadata(metadata),
      });
    },
  };
}

export type AuditRepository = ReturnType<typeof createAuditRepository>;
